import { calculateMA9 } from '../indicators/ma9.js';
import config from '../../config/index.js';

export const name = 'ma9';
export const displayName = 'MA9 Cross';
export const description = 'Price crossing 9-period SMA — go long above, short below';
export const requiredCandles = 20;

export function evaluate(candles) {
  const period = config.ma9.period;

  if (candles.length < period + 2) {
    return { signal: null, reason: 'not_enough_data' };
  }

  const results = calculateMA9(candles, period);
  const latest = results[results.length - 1];
  const latestCandle = candles[candles.length - 1];

  if (!latest) {
    return { signal: null, reason: 'computation_failed' };
  }

  const indicators = {
    ma: latest.ma,
    period,
    type: config.ma9.type,
    cross: latest.cross,
  };

  const meta = {
    price: latestCandle.close,
    ma: latest.ma,
  };

  if (!latest.cross) {
    return { signal: null, reason: 'no_ma_cross', meta, indicators };
  }

  const action = latest.cross === 'above' ? 'BUY' : 'SELL';
  return { signal: action, meta, indicators };
}
