import { calculateSuperTrend } from '../indicators/supertrend.js';
import config from '../../config/index.js';

export const name = 'supertrend';
export const displayName = 'SuperTrend';
export const description = 'ATR-based trailing stop — signals on trend direction flip';
export const requiredCandles = 60;

export function evaluate(candles) {
  const { period, multiplier } = config.supertrend;

  if (candles.length < period + 2) {
    return { signal: null, reason: 'not_enough_data' };
  }

  const results = calculateSuperTrend(candles, period, multiplier);

  const latest = results[results.length - 1];
  const previous = results[results.length - 2];

  if (!latest || !previous) {
    return { signal: null, reason: 'computation_failed' };
  }

  const latestCandle = candles[candles.length - 1];
  const directionChanged = previous.direction !== latest.direction;

  const indicators = {
    supertrend: latest.supertrend,
    direction: latest.direction,
    prevDirection: previous.direction,
    upperBand: latest.upperBand,
    lowerBand: latest.lowerBand,
    period,
    multiplier,
  };

  const meta = {
    price: latestCandle.close,
    direction: latest.direction === 1 ? 'BULLISH' : 'BEARISH',
    supertrend: latest.supertrend,
  };

  if (!directionChanged) {
    return { signal: null, reason: 'no_direction_change', meta, indicators };
  }

  const action = latest.direction === 1 ? 'BUY' : 'SELL';
  return { signal: action, meta, indicators };
}
