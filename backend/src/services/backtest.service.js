import Candle from '../models/candle.model.js';
import { calculateSuperTrend } from './indicators/supertrend.js';
import { pickSuperTrendFlipAtSeriesEnd } from './strategies/supertrend.strategy.js';
import { calculateMACD } from './indicators/macd.js';
import { calculateRSIEMA } from './indicators/rsi-ema.js';
import { calculateMA9 } from './indicators/ma9.js';
import { calculateRSILevels } from './indicators/rsi-levels.js';
import { calculateADXAligned } from './indicators/adx.js';
import {
  filterSignalsByAdx,
  resolveAdxFilterOptions,
  adxWarmupBars,
} from './adx-filter.service.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const STRATEGY_CONFIGS = {
  supertrend: {
    displayName: 'SuperTrend',
    minCandles: () => config.supertrend.period + 2,
    computeSignals(candles) {
      const { period, multiplier } = config.supertrend;
      const results = calculateSuperTrend(candles, period, multiplier);
      const signals = [];
      const seen = new Set();
      const minN = period + 2;

      // Same tail logic as live `evaluate`: after each new closed bar, detect flip on latest
      // or on previous bar (continuation). Dedupe so each flip index emits once.
      for (let n = minN; n <= candles.length; n++) {
        const picked = pickSuperTrendFlipAtSeriesEnd(results, candles, n);
        if (picked.error || picked.noFlip) continue;
        const idx = picked.flipIndex;
        if (seen.has(idx)) continue;
        seen.add(idx);
        signals.push({
          index: idx,
          action: picked.lineAfterFlip.direction === 1 ? 'BUY' : 'SELL',
          /** Legacy backtest: ADX on bar `n−1` when this flip first appears in the prefix walk */
          adxEvaluationIndex: n - 1,
        });
      }
      return { signals, config: { period, multiplier } };
    },
  },

  macd: {
    displayName: 'MACD Crossover',
    minCandles: () => config.macd.slowPeriod + config.macd.signalPeriod + 2,
    computeSignals(candles) {
      const { fastPeriod, slowPeriod, signalPeriod } = config.macd;
      const results = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);
      const signals = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r || !r.crossover) continue;
        signals.push({
          index: i,
          action: r.crossover === 'above' ? 'BUY' : 'SELL',
        });
      }
      return { signals, config: { fastPeriod, slowPeriod, signalPeriod } };
    },
  },

  rsi_ema: {
    displayName: 'RSI + EMA',
    minCandles: () => config.rsiEma.emaPeriod + 2,
    computeSignals(candles) {
      const { rsiPeriod, emaPeriod, oversold, overbought } = config.rsiEma;
      const results = calculateRSIEMA(candles, rsiPeriod, emaPeriod, oversold, overbought);
      const signals = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r || !r.signal) continue;
        signals.push({
          index: i,
          action: r.signal,
        });
      }
      return { signals, config: { rsiPeriod, emaPeriod, oversold, overbought } };
    },
  },

  ma9: {
    displayName: 'MA9 Cross',
    minCandles: () => config.ma9.period + 2,
    computeSignals(candles) {
      const period = config.ma9.period;
      const results = calculateMA9(candles, period);
      const signals = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r || !r.cross) continue;
        signals.push({
          index: i,
          action: r.cross === 'above' ? 'BUY' : 'SELL',
        });
      }
      return { signals, config: { period, type: config.ma9.type } };
    },
  },

  rsi_levels: {
    displayName: 'RSI 60/40',
    minCandles: () => config.rsiLevels.period + 2,
    computeSignals(candles) {
      const { period, buyThreshold, sellThreshold } = config.rsiLevels;
      const results = calculateRSILevels(candles, period, buyThreshold, sellThreshold);
      const signals = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r || !r.signal) continue;
        signals.push({
          index: i,
          action: r.signal,
        });
      }
      return { signals, config: { period, buyThreshold, sellThreshold } };
    },
  },
};

/** Default trade sizing for SuperTrend backtests (margin % SL/TP vs other strategies). */
const SUPERTREND_BACKTEST_DEFAULTS = {
  startBalance: 100,
  leverage: 4,
  slPercent: 20,
  tpPercent: 20,
};

/**
 * Runs a backtest for any supported strategy over stored candle data.
 */
export async function runBacktest(params = {}) {
  const strategyName = params.strategy ?? 'supertrend';
  const tradeDefaults =
    strategyName === 'supertrend'
      ? { ...SUPERTREND_BACKTEST_DEFAULTS }
      : {
          startBalance: 50,
          leverage: config.aster.leverage,
          slPercent: config.aster.slPercent,
          tpPercent: config.aster.tpPercent,
        };

  const merged = {
    strategy: strategyName,
    symbol: 'BTCUSDT',
    feePercent: 0.05,
    ...tradeDefaults,
    ...params,
  };

  const {
    strategy,
    symbol,
    startBalance,
    leverage,
    feePercent,
    slPercent,
    tpPercent,
    adxFilterEnabled,
    adxPeriod,
    adxThreshold,
  } = merged;

  const strategyDef = STRATEGY_CONFIGS[strategy];
  if (!strategyDef) {
    throw new Error(`Unknown strategy: ${strategy}. Available: ${Object.keys(STRATEGY_CONFIGS).join(', ')}`);
  }

  const adxOpts = resolveAdxFilterOptions({ adxFilterEnabled, adxPeriod, adxThreshold });

  const interval = config.binance.interval;
  const strategyMin = strategyDef.minCandles();
  const adxMin = adxOpts.enabled ? adxWarmupBars(adxOpts.period) : 0;
  const minCandles = Math.max(strategyMin, adxMin);

  const candles = await Candle.find({ symbol, interval })
    .sort({ openTime: 1 })
    .lean();

  if (candles.length < minCandles) {
    throw new Error(
      `Not enough candle data for ${symbol}. Need at least ${minCandles}, have ${candles.length}.`,
    );
  }

  const { signals: rawSignals, config: strategyConfig } = strategyDef.computeSignals(candles);
  const filterResult = filterSignalsByAdx(candles, rawSignals, adxOpts);
  const { signals, rawCount, filteredCount, adxAligned } = filterResult;

  const supertrendRows =
    strategy === 'supertrend'
      ? calculateSuperTrend(candles, config.supertrend.period, config.supertrend.multiplier)
      : null;

  const adxForDiag = adxAligned ?? calculateADXAligned(candles, adxOpts.period);
  const adxRows = adxOpts.enabled ? adxForDiag : null;

  const trades = [];
  let balance = startBalance;
  let peakBalance = startBalance;
  let maxDrawdown = 0;
  let slHits = 0;
  let tpHits = 0;
  let openTrade = null;

  function closeTrade(exitPrice, exitTime, exitReason) {
    if (!openTrade) return;

    const margin = openTrade.margin;
    const notional = margin * leverage;
    const exitFee = (notional * feePercent) / 100;

    let pnl;
    if (openTrade.side === 'LONG') {
      pnl = ((exitPrice - openTrade.entryPrice) / openTrade.entryPrice) * notional;
    } else {
      pnl = ((openTrade.entryPrice - exitPrice) / openTrade.entryPrice) * notional;
    }

    const netPnl = pnl - openTrade.entryFee - exitFee;
    balance += netPnl;

    trades.push({
      entryTime: openTrade.entryTime,
      exitTime,
      side: openTrade.side,
      entryPrice: openTrade.entryPrice,
      exitPrice,
      margin,
      pnl: round(netPnl),
      fee: round(openTrade.entryFee + exitFee),
      balanceAfter: round(balance),
      exitReason,
      slPrice: openTrade.slPrice,
      tpPrice: openTrade.tpPrice,
    });

    if (exitReason === 'stop_loss') slHits++;
    if (exitReason === 'take_profit') tpHits++;

    if (balance > peakBalance) peakBalance = balance;
    const drawdown = peakBalance > 0 ? ((peakBalance - balance) / peakBalance) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    openTrade = null;
  }

  function openNewTrade(side, entryPrice, entryTime) {
    const margin = balance > 0 ? balance : 0;
    if (margin <= 0) return;

    const notional = margin * leverage;
    const entryFee = (notional * feePercent) / 100;

    const slPriceMove = slPercent / 100 / leverage;
    const tpPriceMove = tpPercent / 100 / leverage;

    let slPrice, tpPrice;
    if (side === 'LONG') {
      slPrice = round(entryPrice * (1 - slPriceMove));
      tpPrice = round(entryPrice * (1 + tpPriceMove));
    } else {
      slPrice = round(entryPrice * (1 + slPriceMove));
      tpPrice = round(entryPrice * (1 - tpPriceMove));
    }

    openTrade = { side, entryPrice, entryTime, margin, entryFee, slPrice, tpPrice };
  }

  // Build a lookup set for fast signal checking
  const signalMap = new Map();
  for (const sig of signals) {
    signalMap.set(sig.index, sig.action);
  }

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];

    // Check SL/TP on every candle while a trade is open
    if (openTrade) {
      if (openTrade.side === 'LONG') {
        if (candle.low <= openTrade.slPrice) {
          closeTrade(openTrade.slPrice, candle.openTime, 'stop_loss');
        } else if (candle.high >= openTrade.tpPrice) {
          closeTrade(openTrade.tpPrice, candle.openTime, 'take_profit');
        }
      } else {
        if (candle.high >= openTrade.slPrice) {
          closeTrade(openTrade.slPrice, candle.openTime, 'stop_loss');
        } else if (candle.low <= openTrade.tpPrice) {
          closeTrade(openTrade.tpPrice, candle.openTime, 'take_profit');
        }
      }
    }

    // Check for strategy signal at this candle
    let action = signalMap.get(i);

    // SuperTrend-only fallback:
    // If a flip candle was blocked by ADX, keep checking subsequent candles.
    // Once ADX confirms while direction is still opposite to the open side,
    // treat it as a delayed flip signal.
    if (!action && strategy === 'supertrend' && openTrade && supertrendRows?.[i]) {
      const row = supertrendRows[i];
      const expected = row.direction === 1 ? 'BUY' : 'SELL';
      const openSide = openTrade.side === 'LONG' ? 'BUY' : 'SELL';
      const isOpposite = expected !== openSide;
      const adxOk = !adxOpts.enabled || ((adxRows?.[i]?.adx ?? -1) >= adxOpts.threshold);

      if (isOpposite && adxOk) {
        action = expected;
      }
    }

    if (action) {
      const price = candle.close;
      const newSide = action === 'BUY' ? 'LONG' : 'SHORT';

      if (openTrade) {
        // If the signal is in the same direction as current trade, skip
        if (openTrade.side === newSide) continue;
        closeTrade(price, candle.openTime, 'signal_flip');
      }

      openNewTrade(newSide, price, candle.openTime);
    }
  }

  // Close any remaining open trade at the last candle
  if (openTrade && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const netPnl = calculatePnl(openTrade, lastCandle.close, leverage, feePercent);
    balance += netPnl;

    trades.push({
      entryTime: openTrade.entryTime,
      exitTime: lastCandle.openTime,
      side: openTrade.side,
      entryPrice: openTrade.entryPrice,
      exitPrice: lastCandle.close,
      margin: openTrade.margin,
      pnl: round(netPnl),
      fee: round(openTrade.entryFee + (openTrade.margin * leverage * feePercent) / 100),
      balanceAfter: round(balance),
      exitReason: 'still_open',
      slPrice: openTrade.slPrice,
      tpPrice: openTrade.tpPrice,
      stillOpen: true,
    });

    if (balance > peakBalance) peakBalance = balance;
    const drawdown = peakBalance > 0 ? ((peakBalance - balance) / peakBalance) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const winCount = trades.filter((t) => t.pnl > 0).length;
  const lossCount = trades.filter((t) => t.pnl <= 0).length;
  const totalReturn = startBalance > 0 ? ((balance - startBalance) / startBalance) * 100 : 0;

  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];

  const summary = {
    strategy,
    strategyDisplayName: strategyDef.displayName,
    symbol,
    startBalance: round(startBalance),
    endBalance: round(balance),
    totalReturn: round(totalReturn),
    totalTrades: trades.length,
    winCount,
    lossCount,
    winRate: trades.length > 0 ? round((winCount / trades.length) * 100) : 0,
    maxDrawdown: round(maxDrawdown),
    slHits,
    tpHits,
    signalFlips: trades.filter((t) => t.exitReason === 'signal_flip').length,
    leverage,
    feePercent,
    slPercent,
    tpPercent,
    period: {
      from: firstCandle.openTime,
      to: lastCandle.openTime,
    },
    totalCandles: candles.length,
    strategyConfig,
    adxFilter: {
      enabled: adxOpts.enabled,
      period: adxOpts.period,
      threshold: adxOpts.threshold,
      signalsRaw: rawCount,
      signalsFilteredOut: filteredCount,
      signalsUsed: signals.length,
    },
    ...(strategy === 'supertrend' && supertrendRows
      ? {
          superTrendDiagnostics: buildSuperTrendDiagnostics({
            candles,
            rawSignals,
            filteredSignals: signals,
            adxOpts,
            adxAligned: adxForDiag,
            stRows: supertrendRows,
          }),
        }
      : {}),
  };

  logger.info(`Backtest complete: ${strategyDef.displayName} on ${symbol}`, summary);

  return { summary, trades };
}

// Keep backward-compatible export
export async function runSupertrendBacktest(opts) {
  return runBacktest({ ...opts, strategy: 'supertrend' });
}

function calculatePnl(openTrade, exitPrice, leverage, feePercent) {
  const notional = openTrade.margin * leverage;
  const exitFee = (notional * feePercent) / 100;
  let pnl;
  if (openTrade.side === 'LONG') {
    pnl = ((exitPrice - openTrade.entryPrice) / openTrade.entryPrice) * notional;
  } else {
    pnl = ((openTrade.entryPrice - exitPrice) / openTrade.entryPrice) * notional;
  }
  return pnl - openTrade.entryFee - exitFee;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Explains recent bars + why the latest SuperTrend flip may not have become a trade (usually ADX < threshold).
 */
function buildSuperTrendDiagnostics({
  candles,
  rawSignals,
  filteredSignals,
  adxOpts,
  adxAligned,
  stRows,
}) {
  const tailN = 8;
  const start = Math.max(0, candles.length - tailN);
  const tailBars = [];
  for (let i = start; i < candles.length; i++) {
    const st = stRows[i];
    const adx = adxAligned?.[i];
    tailBars.push({
      openTime: candles[i].openTime,
      close: round(candles[i].close),
      stDirection: st ? (st.direction === 1 ? 'BULL' : 'BEAR') : null,
      adx: adx?.adx ?? null,
    });
  }

  const filteredSet = new Set(filteredSignals.map((s) => s.index));
  let lastBlockedSignal = null;
  for (let j = rawSignals.length - 1; j >= 0; j--) {
    const s = rawSignals[j];
    if (filteredSet.has(s.index)) continue;
    const adxIdx = s.adxEvaluationIndex ?? s.index;
    const row = adxAligned?.[adxIdx];
    lastBlockedSignal = {
      signalIndex: s.index,
      action: s.action,
      signalBarOpenTime: candles[s.index].openTime,
      adxEvaluationIndex: adxIdx,
      adxAtEvaluation: row?.adx ?? null,
      adxThreshold: adxOpts.threshold,
      reason: !adxOpts.enabled
        ? 'adx_filter_disabled'
        : !row
          ? 'adx_not_available'
          : 'adx_below_threshold',
    };
    break;
  }

  let note = null;
  if (adxOpts.enabled && lastBlockedSignal?.reason === 'adx_below_threshold') {
    const adxVal = lastBlockedSignal.adxAtEvaluation ?? 'N/A';
    note = `SuperTrend produced ${lastBlockedSignal.action} on the signal bar, but ADX on the evaluation bar was ${adxVal} (needs ≥ ${lastBlockedSignal.adxThreshold}). Lower “ADX min” or disable the filter to include such signals.`;
  } else if (adxOpts.enabled && lastBlockedSignal?.reason === 'adx_not_available') {
    note = 'Latest SuperTrend signal was skipped because ADX was not available at the evaluation index (warmup).';
  }

  return { tailBars, lastBlockedSignal, note };
}
