import Order from '../models/order.model.js';
import BotLog from '../models/bot-log.model.js';
import Signal from '../models/signal.model.js';
import * as aster from './aster.service.js';
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

const MIN_QTY = { BTCUSDT: 0.001, ETHUSDT: 0.01 };
const QTY_DECIMALS = { BTCUSDT: 3, ETHUSDT: 2 };

function calculateQuantity(price, symbol, runtimeParams) {
  const notional = runtimeParams.tradeUsdt;
  const raw = (notional * runtimeParams.leverage) / price;

  const decimals = QTY_DECIMALS[symbol] ?? 3;
  const qty = parseFloat(raw.toFixed(decimals));
  const minQty = MIN_QTY[symbol] ?? 0.001;

  return Math.max(qty, minQty);
}

async function saveOrder(data) {
  return Order.create(data);
}

async function closeExistingPosition(symbol, runtimeParams) {
  try {
    const positions = await aster.getPositions(symbol);
    if (!positions.length) return null;

    const position = positions[0];
    const amt = parseFloat(position.positionAmt);
    if (amt === 0) return null;

    await aster.cancelAllOrders(symbol);

    const closeSide = amt > 0 ? 'SELL' : 'BUY';
    const closeQty = Math.abs(amt);

    logger.info(`[ASTER] Closing existing ${symbol} position`, {
      side: closeSide,
      quantity: closeQty,
    });

    const result = await aster.placeMarketOrder(symbol, closeSide, closeQty);

    await saveOrder({
      strategy: 'system',
      symbol,
      side: closeSide,
      type: 'MARKET',
      quantity: closeQty,
      price: parseFloat(result.avgPrice || result.price || 0),
      leverage: runtimeParams.leverage,
      status: 'FILLED',
      asterOrderId: result.orderId?.toString(),
    });

    return result;
  } catch (err) {
    logger.error(`[ASTER] Failed to close position for ${symbol}`, { error: err.message });
    throw err;
  }
}

/**
 * Execute a signal on Aster Dex (Binance-compatible futures API).
 */
export async function executeSignal(signalDoc, runtimeParamsInput = {}) {
  const { symbol, action: side, strategy, price: signalPrice, _id: signalId } = signalDoc;
  const runtimeParams = {
    leverage: config.aster.leverage,
    tradeUsdt: config.aster.tradeUsdt,
    slPercent: config.aster.slPercent,
    tpPercent: config.aster.tpPercent,
    ...runtimeParamsInput,
  };

  if (!aster.isConfigured()) {
    logger.warn('ASTER API keys not configured — skipping order execution');
    return null;
  }

  logger.info(`═══ [ASTER] Executing ${side} order for ${symbol} [${strategy}] ═══`);

  try {
    await aster.setLeverage(symbol, runtimeParams.leverage);

    await closeExistingPosition(symbol, runtimeParams);

    const quantity = calculateQuantity(signalPrice, symbol, runtimeParams);

    const entryResult = await aster.placeMarketOrder(symbol, side, quantity);
    const fillPrice = parseFloat(entryResult.avgPrice || entryResult.price || signalPrice);

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
      asterOrderId: entryResult.orderId?.toString(),
    });

    logger.info(`[ASTER] Entry order filled: ${side} ${quantity} ${symbol} @ ${fillPrice}`, {
      orderId: entryResult.orderId,
    });

    const { stopLoss, takeProfit } = calculateSlTp(fillPrice, side, runtimeParams);
    const slSide = side === 'BUY' ? 'SELL' : 'BUY';

    try {
      const slResult = await aster.placeStopLoss(symbol, slSide, quantity, stopLoss);
      await saveOrder({
        strategy,
        signalId,
        symbol,
        side: slSide,
        type: 'STOP_MARKET',
        quantity,
        stopPrice: stopLoss,
        leverage: runtimeParams.leverage,
        status: 'NEW',
        asterOrderId: slResult.orderId?.toString(),
        parentOrderId: entryOrder._id,
      });
      logger.info(`[ASTER] Stop-loss placed: ${slSide} @ ${stopLoss}`, { orderId: slResult.orderId });
    } catch (err) {
      logger.error(`[ASTER] Failed to place stop-loss for ${symbol}`, { error: err.message });
    }

    try {
      const tpResult = await aster.placeTakeProfit(symbol, slSide, quantity, takeProfit);
      await saveOrder({
        strategy,
        signalId,
        symbol,
        side: slSide,
        type: 'TAKE_PROFIT_MARKET',
        quantity,
        stopPrice: takeProfit,
        leverage: runtimeParams.leverage,
        status: 'NEW',
        asterOrderId: tpResult.orderId?.toString(),
        parentOrderId: entryOrder._id,
      });
      logger.info(`[ASTER] Take-profit placed: ${slSide} @ ${takeProfit}`, { orderId: tpResult.orderId });
    } catch (err) {
      logger.error(`[ASTER] Failed to place take-profit for ${symbol}`, { error: err.message });
    }

    await Signal.findByIdAndUpdate(signalId, { executed: true });

    await BotLog.create({
      strategy,
      symbol,
      action: side,
      price: fillPrice,
      candleOpenTime: signalDoc.candleOpenTime,
      indicators: signalDoc.indicators,
      status: 'order_placed',
      message: `[ASTER] ${side} ${quantity} ${symbol} @ ${fillPrice} | SL: ${stopLoss} | TP: ${takeProfit} | ${runtimeParams.leverage}x`,
    });

    logger.info(`═══ [ASTER] Order execution complete for ${symbol} ═══`, {
      entry: fillPrice,
      stopLoss,
      takeProfit,
      leverage: runtimeParams.leverage,
    });

    return entryOrder;
  } catch (err) {
    logger.error(`[ASTER] Order execution failed for ${symbol}`, {
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
      message: `[ASTER] Failed: ${err.message}`,
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
