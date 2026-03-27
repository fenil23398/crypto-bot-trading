import { calculateMACD } from '../indicators/macd.js';
import config from '../../config/index.js';

export const name = 'macd';
export const displayName = 'MACD Crossover';
export const description = 'MACD line crossing signal line — classic momentum strategy';
export const requiredCandles = 100;

export function evaluate(candles) {
  const { fastPeriod, slowPeriod, signalPeriod } = config.macd;

  if (candles.length < slowPeriod + signalPeriod + 2) {
    return { signal: null, reason: 'not_enough_data' };
  }

  const results = calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod);

  const latest = results[results.length - 1];
  const latestCandle = candles[candles.length - 1];

  if (!latest) {
    return { signal: null, reason: 'computation_failed' };
  }

  const indicators = {
    macd: latest.macd,
    signal: latest.signal,
    histogram: latest.histogram,
    position: latest.position,
    fastPeriod,
    slowPeriod,
    signalPeriod,
  };

  const meta = {
    price: latestCandle.close,
    macd: latest.macd,
    signal: latest.signal,
    histogram: latest.histogram,
  };

  if (!latest.crossover) {
    return { signal: null, reason: 'no_crossover', meta, indicators };
  }

  const action = latest.crossover === 'above' ? 'BUY' : 'SELL';
  return { signal: action, meta, indicators };
}
