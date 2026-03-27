import Candle from '../models/candle.model.js';
import Signal from '../models/signal.model.js';
import BotLog from '../models/bot-log.model.js';
import BotConfig from '../models/bot-config.model.js';
import { getStrategy, getAllStrategies, strategyExists } from './strategies/registry.js';
import { executeSignal } from './order-manager.service.js';
import * as aster from './aster.service.js';
import {
  passesAdxTrendFilter,
  resolveAdxFilterOptions,
  adxWarmupBars,
} from './adx-filter.service.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const activeBots = new Map();

export function getDefaultRuntimeParams() {
  const adx = resolveAdxFilterOptions();
  return {
    leverage: config.aster.leverage,
    tradeUsdt: config.aster.tradeUsdt,
    slPercent: config.aster.slPercent,
    tpPercent: config.aster.tpPercent,
    adxFilterEnabled: adx.enabled,
    adxPeriod: adx.period,
    adxThreshold: adx.threshold,
    symbols: [...config.binance.symbols],
  };
}

function normalizeRuntimeParams(input = {}) {
  const defaults = getDefaultRuntimeParams();
  const merged = {
    ...defaults,
    ...input,
  };

  const allowedSymbols = new Set(config.binance.symbols);
  const requestedSymbols = Array.isArray(merged.symbols)
    ? merged.symbols
    : merged.symbol
      ? [merged.symbol]
      : defaults.symbols;
  const normalizedSymbols = requestedSymbols
    .map((s) => String(s || '').toUpperCase().trim())
    .filter((s) => allowedSymbols.has(s));

  return {
    leverage: Math.max(1, parseInt(merged.leverage, 10) || defaults.leverage),
    tradeUsdt: Math.max(1, parseFloat(merged.tradeUsdt) || defaults.tradeUsdt),
    slPercent: Math.max(0, parseFloat(merged.slPercent) || defaults.slPercent),
    tpPercent: Math.max(0, parseFloat(merged.tpPercent) || defaults.tpPercent),
    adxFilterEnabled: Boolean(merged.adxFilterEnabled),
    adxPeriod: Math.max(2, parseInt(merged.adxPeriod, 10) || defaults.adxPeriod),
    adxThreshold: Math.max(0, parseFloat(merged.adxThreshold) || defaults.adxThreshold),
    symbols: normalizedSymbols.length ? normalizedSymbols : defaults.symbols,
  };
}

async function getStoredRuntimeParams(strategyName) {
  const row = await BotConfig.findOne({ strategy: strategyName }).lean();
  return row?.runtimeParams ? normalizeRuntimeParams(row.runtimeParams) : null;
}

async function saveRuntimeParams(strategyName, runtimeParams) {
  await BotConfig.findOneAndUpdate(
    { strategy: strategyName },
    {
      strategy: strategyName,
      runtimeParams,
      lastStartedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function loadCandles(symbol, interval, limit) {
  return Candle.find({ symbol, interval })
    .sort({ openTime: -1 })
    .limit(limit)
    .lean()
    .then((docs) => docs.reverse());
}

function candleLimitForStrategy(strategy, runtimeParams) {
  const base = strategy.requiredCandles;
  const opts = resolveAdxFilterOptions({
    adxFilterEnabled: runtimeParams.adxFilterEnabled,
    adxPeriod: runtimeParams.adxPeriod,
    adxThreshold: runtimeParams.adxThreshold,
  });
  if (!opts.enabled) return base;
  return Math.max(base, adxWarmupBars(opts.period) + 5);
}

async function signalExists(symbol, strategy, candleOpenTime) {
  return !!(await Signal.findOne({ symbol, strategy, candleOpenTime }).lean());
}

/**
 * Evaluates a single strategy for a single symbol.
 * If a signal is generated, stores it in both signals and bot_logs.
 */
async function evaluateStrategyForSymbol(strategy, symbol, interval, botState) {
  const runtimeParams = botState.runtimeParams;
  const limit = candleLimitForStrategy(strategy, runtimeParams);
  const candles = await loadCandles(symbol, interval, limit);
  const result = strategy.evaluate(candles);

  const latestCandle = candles[candles.length - 1];

  let signalAction = result.signal;
  let delayedFlip = false;

  // SuperTrend-only delayed flip:
  // if we already hold an opposite position and ADX was too weak on flip candle,
  // allow execution on a later candle once ADX confirms.
  if (!signalAction && strategy.name === 'supertrend' && aster.isConfigured()) {
    const stDirection = result?.indicators?.direction;
    if (stDirection === 1 || stDirection === -1) {
      try {
        const positions = await aster.getPositions(symbol);
        const pos = positions[0];
        const amt = pos ? parseFloat(pos.positionAmt) : 0;

        if (amt !== 0) {
          const heldSide = amt > 0 ? 'BUY' : 'SELL';
          const trendSide = stDirection === 1 ? 'BUY' : 'SELL';
          if (heldSide !== trendSide) {
            signalAction = trendSide;
            delayedFlip = true;
          }
        }
      } catch (err) {
        logger.warn(`[${strategy.displayName}] ${symbol}: could not inspect live position`, {
          error: err.message,
        });
      }
    }
  }

  if (!signalAction) {
    logger.info(`[${strategy.displayName}] ${symbol}: no signal — ${result.reason}`, result.meta);
    return null;
  }

  const adxCheck = passesAdxTrendFilter(candles, {
    enabled: runtimeParams.adxFilterEnabled,
    period: runtimeParams.adxPeriod,
    threshold: runtimeParams.adxThreshold,
  });
  if (!adxCheck.pass) {
    logger.info(
      `[${strategy.displayName}] ${symbol}: signal skipped — ADX trend filter (${adxCheck.reason})`,
      adxCheck.snapshot ?? {},
    );
    return null;
  }

  result.indicators = {
    ...result.indicators,
    adxFilter: adxCheck.snapshot,
    runtimeParams,
    delayedFlip,
  };

  const alreadyExists = await signalExists(symbol, strategy.name, latestCandle.openTime);
  if (alreadyExists) {
    logger.info(`[${strategy.displayName}] ${symbol}: signal already recorded for ${latestCandle.openTime.toISOString()}`);
    return null;
  }

  const signalDoc = await Signal.create({
    symbol,
    interval,
    strategy: strategy.name,
    action: signalAction,
    price: latestCandle.close,
    candleOpenTime: latestCandle.openTime,
    indicators: result.indicators,
  });

  const botLog = await BotLog.create({
    strategy: strategy.name,
    symbol,
    action: signalAction,
    price: latestCandle.close,
    candleOpenTime: latestCandle.openTime,
    indicators: result.indicators,
    status: 'signal_generated',
    message: `${signalAction} signal @ ${latestCandle.close} — ${strategy.displayName}${delayedFlip ? ' delayed flip confirmation' : ' triggered'}`,
  });

  logger.info(
    `🔔 [${strategy.displayName}] ${signalAction} ORDER INITIATED — ${symbol} @ ${latestCandle.close}`,
    { ...result.meta, candleTime: latestCandle.openTime.toISOString() },
  );

  try {
    await executeSignal(signalDoc, runtimeParams);
  } catch (err) {
    logger.error(`[${strategy.displayName}] ${symbol}: order execution failed`, {
      error: err.message,
    });
  }

  return { signal: signalDoc, log: botLog };
}

// ─── Public API ──────────────────────────────────────────────

export async function startBot(strategyName, params = {}) {
  if (!strategyExists(strategyName)) {
    throw new Error(`Unknown strategy: ${strategyName}`);
  }

  const runtimeParams = normalizeRuntimeParams(params);

  if (activeBots.has(strategyName)) {
    const existing = activeBots.get(strategyName);
    return { status: 'already_running', strategy: strategyName, runtimeParams: existing.runtimeParams };
  }

  await saveRuntimeParams(strategyName, runtimeParams);

  activeBots.set(strategyName, {
    startedAt: new Date(),
    evaluations: 0,
    signalsGenerated: 0,
    runtimeParams,
  });

  logger.info(`Bot started: ${strategyName}`, runtimeParams);
  return { status: 'started', strategy: strategyName, runtimeParams };
}

export function stopBot(strategyName) {
  if (!activeBots.has(strategyName)) {
    return { status: 'not_running', strategy: strategyName };
  }

  const stats = activeBots.get(strategyName);
  activeBots.delete(strategyName);

  logger.info(`Bot stopped: ${strategyName}`, stats);
  return { status: 'stopped', strategy: strategyName, stats };
}

export async function getBotStatus(strategyName) {
  if (!strategyExists(strategyName)) {
    return null;
  }

  const strategy = getStrategy(strategyName);
  const botState = activeBots.get(strategyName);
  const persisted = await getStoredRuntimeParams(strategyName);
  const runtimeParams = botState?.runtimeParams ?? persisted ?? getDefaultRuntimeParams();

  return {
    name: strategy.name,
    displayName: strategy.displayName,
    description: strategy.description,
    requiredCandles: strategy.requiredCandles,
    active: !!botState,
    runtimeParams,
    ...(botState && {
      startedAt: botState.startedAt,
      evaluations: botState.evaluations,
      signalsGenerated: botState.signalsGenerated,
    }),
  };
}

export async function getAllBotStatuses() {
  const persistedRows = await BotConfig.find({}).lean();
  const persistedMap = new Map(persistedRows.map((row) => [row.strategy, normalizeRuntimeParams(row.runtimeParams)]));

  return getAllStrategies().map((s) => {
    const botState = activeBots.get(s.name);
    const runtimeParams = botState?.runtimeParams ?? persistedMap.get(s.name) ?? getDefaultRuntimeParams();
    return {
      ...s,
      active: !!botState,
      runtimeParams,
      ...(botState && {
        startedAt: botState.startedAt,
        evaluations: botState.evaluations,
        signalsGenerated: botState.signalsGenerated,
      }),
    };
  });
}

/**
 * Called by the scheduler after each data sync.
 * Only evaluates strategies that have active bots.
 */
export async function evaluateActiveBots() {
  const { interval } = config.binance;
  const activeStrategies = Array.from(activeBots.keys());

  if (!activeStrategies.length) {
    logger.info('No active bots — skipping evaluation');
    return [];
  }

  logger.info(`═══ Evaluating ${activeStrategies.length} active bot(s): ${activeStrategies.join(', ')} ═══`);

  const allSignals = [];

  for (const strategyName of activeStrategies) {
    const strategy = getStrategy(strategyName);
    const botState = activeBots.get(strategyName);
    const symbols = botState.runtimeParams?.symbols?.length
      ? botState.runtimeParams.symbols
      : config.binance.symbols;

    for (const symbol of symbols) {
      try {
        const result = await evaluateStrategyForSymbol(strategy, symbol, interval, botState);
        botState.evaluations++;
        if (result) {
          botState.signalsGenerated++;
          allSignals.push(result.signal);
        }
      } catch (err) {
        logger.error(`[${strategy.displayName}] ${symbol}: evaluation failed`, {
          error: err.message,
        });
      }
    }
  }

  const signalCount = allSignals.length;
  logger.info(
    signalCount
      ? `Evaluation complete — ${signalCount} signal(s) generated`
      : 'Evaluation complete — no new signals',
    { signals: allSignals.map((s) => `${s.action} ${s.symbol} @ ${s.price}`) },
  );

  return allSignals;
}
