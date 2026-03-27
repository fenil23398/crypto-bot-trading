import { calculateRSILevels } from '../indicators/rsi-levels.js';
import config from '../../config/index.js';

export const name = 'rsi_levels';
export const displayName = 'RSI 60/40';
export const description = 'RSI cross above 60 → BUY, cross below 40 → SELL (short)';
export const requiredCandles = 20;

export function evaluate(candles) {
  const { period, buyThreshold, sellThreshold } = config.rsiLevels;

  if (candles.length < period + 2) {
    return { signal: null, reason: 'not_enough_data' };
  }

  const results = calculateRSILevels(candles, period, buyThreshold, sellThreshold);
  const latest = results[results.length - 1];
  const latestCandle = candles[candles.length - 1];

  if (!latest) {
    return { signal: null, reason: 'computation_failed' };
  }

  const indicators = {
    rsi: latest.rsi,
    period,
    buyThreshold,
    sellThreshold,
  };

  const meta = {
    price: latestCandle.close,
    rsi: latest.rsi,
  };

  if (!latest.signal) {
    return { signal: null, reason: 'no_level_cross', meta, indicators };
  }

  return { signal: latest.signal, meta, indicators };
}
