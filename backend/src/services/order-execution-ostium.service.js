import Order from '../models/order.model.js';
import BotLog from '../models/bot-log.model.js';
import Signal from '../models/signal.model.js';
import * as ostium from './ostium.service.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

function calculateSlTp(entryPrice, side, runtimeParams) {
  const { leverage, slPercent, tpPercent } = runtimeParams;
  const slPriceMove = slPercent / 100 / leverage;
  const tpPriceMove = tpPercent / 100 / leverage;

  if (side === 'BUY') {
    return {
      stopLoss: round(entryPrice * (1 - slPriceMove)),
      takeProfit: round(entryPrice * (1 + tpPriceMove)),
    };
  }

  return {
    stopLoss: round(entryPrice * (1 + slPriceMove)),
    takeProfit: round(entryPrice * (1 - tpPriceMove)),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

async function saveOrder(data) {
  return Order.create(data);
}

async function closeExistingPosition(symbol, runtimeParams) {
  try {
    const positions = await ostium.getPositions(symbol);
    const position = positions[0];
    const amt = position ? parseFloat(position.positionAmt) : 0;

    const result = await ostium.closeAllForSymbol(symbol);
    const txs = result.closed || [];
    if (!txs.length) return null;

    logger.info(`[OSTIUM] Closed ${txs.length} existing trade(s) for ${symbol}`, { positionAmt: amt });

    const closeSide = amt > 0 ? 'SELL' : 'BUY';
    for (const c of txs) {
      await saveOrder({
        strategy: 'system',
        symbol,
        side: closeSide,
        type: 'MARKET',
        quantity: Math.abs(amt) || 1,
        price: 0,
        leverage: runtimeParams.leverage,
        status: 'FILLED',
        ostiumOrderId: c.txHash || String(c.tradeIndex),
      });
    }

    return result;
  } catch (err) {
    logger.error(`[OSTIUM] Failed to close position for ${symbol}`, { error: err.message });
    throw err;
  }
}

/**
 * Execute a signal on Ostium via ostium-python-sdk (HTTP bridge in /ostium-bridge).
 */
export async function executeSignal(signalDoc, runtimeParamsInput = {}) {
  const { symbol, action: side, strategy, price: signalPrice, _id: signalId } = signalDoc;
  const runtimeParams = {
    leverage: config.ostium.leverage,
    tradeUsdt: config.ostium.tradeUsdt,
    slPercent: config.ostium.slPercent,
    tpPercent: config.ostium.tpPercent,
    ...runtimeParamsInput,
  };

  if (!ostium.isConfigured()) {
    logger.warn('OSTIUM_BRIDGE_URL not set — skipping Ostium order execution');
    return null;
  }

  logger.info(`═══ [OSTIUM] Executing ${side} order for ${symbol} [${strategy}] ═══`);

  try {
    await ostium.setLeverage(symbol, runtimeParams.leverage);

    await closeExistingPosition(symbol, runtimeParams);

    const { stopLoss, takeProfit } = calculateSlTp(signalPrice, side, runtimeParams);

    const entryResult = await ostium.openMarket({
      symbol,
      side,
      collateral: runtimeParams.tradeUsdt,
      leverage: runtimeParams.leverage,
      stopLoss,
      takeProfit,
    });

    const fillPrice = parseFloat(entryResult.avgPrice || signalPrice);
    const quantity =
      fillPrice > 0
        ? round((runtimeParams.tradeUsdt * runtimeParams.leverage) / fillPrice)
        : 0;

    const entryOrder = await saveOrder({
      strategy,
      signalId,
      symbol,
      side,
      type: 'MARKET',
      quantity,
      price: fillPrice,
      leverage: runtimeParams.leverage,
      status: 'FILLED',
      ostiumOrderId: entryResult.orderId?.toString() || entryResult.txHash || null,
    });

    logger.info(`[OSTIUM] Market open submitted: ${side} ${symbol} @ ~${fillPrice}`, {
      orderId: entryResult.orderId,
      txHash: entryResult.txHash,
    });

    await Signal.findByIdAndUpdate(signalId, { executed: true });

    await BotLog.create({
      strategy,
      symbol,
      action: side,
      price: fillPrice,
      candleOpenTime: signalDoc.candleOpenTime,
      indicators: signalDoc.indicators,
      status: 'order_placed',
      message: `[OSTIUM SDK] ${side} collateral ${runtimeParams.tradeUsdt} USDC ${runtimeParams.leverage}x ${symbol} | SL: ${stopLoss} | TP: ${takeProfit} | tx ${entryResult.txHash || 'n/a'}`,
    });

    logger.info(`═══ [OSTIUM] Order execution complete for ${symbol} ═══`, {
      entry: fillPrice,
      stopLoss,
      takeProfit,
      leverage: runtimeParams.leverage,
    });

    return entryOrder;
  } catch (err) {
    logger.error(`[OSTIUM] Order execution failed for ${symbol}`, {
      error: err.message,
      strategy,
      side,
    });

    await BotLog.create({
      strategy,
      symbol,
      action: side,
      price: signalPrice,
      candleOpenTime: signalDoc.candleOpenTime,
      indicators: signalDoc.indicators,
      status: 'order_failed',
      message: `[OSTIUM SDK] Failed: ${err.message}`,
    });

    await saveOrder({
      strategy,
      signalId,
      symbol,
      side,
      type: 'MARKET',
      quantity: 0,
      price: signalPrice,
      leverage: runtimeParams.leverage,
      status: 'FAILED',
      error: err.message,
    });

    return null;
  }
}
