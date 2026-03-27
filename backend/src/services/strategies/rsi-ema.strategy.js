import { calculateRSIEMA } from '../indicators/rsi-ema.js';
import config from '../../config/index.js';

export const name = 'rsi_ema';
export const displayName = 'RSI + EMA';
export const description = 'RSI oversold/overbought reversals filtered by EMA trend direction';
export const requiredCandles = 250;

export function evaluate(candles) {
  const { rsiPeriod, emaPeriod, oversold, overbought } = config.rsiEma;

  if (candles.length < emaPeriod + 2) {
    return { signal: null, reason: 'not_enough_data' };
  }

  const results = calculateRSIEMA(candles, rsiPeriod, emaPeriod, oversold, overbought);

  const latest = results[results.length - 1];
  const latestCandle = candles[candles.length - 1];

  if (!latest) {
    return { signal: null, reason: 'computation_failed' };
  }

  const indicators = {
    rsi: latest.rsi,
    ema: latest.ema,
    zone: latest.zone,
    aboveEma: latest.aboveEma,
    rsiPeriod,
    emaPeriod,
    oversold,
    overbought,
  };

  const meta = {
    price: latestCandle.close,
    rsi: latest.rsi,
    ema: latest.ema,
    zone: latest.zone,
  };

  if (!latest.signal) {
    return { signal: null, reason: 'no_reversal_signal', meta, indicators };
  }

  return { signal: latest.signal, meta, indicators };
}
