import { SMA } from 'technicalindicators';

/**
 * Simple Moving Average (default period 9) aligned to candles.
 * Detects price crossing above/below the MA (crossover signals).
 *
 * @param {Array} candles - Ascending by openTime, each { close }
 * @param {number} period - MA length (default 9)
 * @returns {Array} Per index: { ma, cross } where cross is 'above' | 'below' | null
 */
export function calculateMA9(candles, period = 9) {
  if (candles.length < period + 1) {
    return [];
  }

  const closes = candles.map((c) => c.close);
  const smaValues = SMA.calculate({ period, values: closes });
  const offset = candles.length - smaValues.length;
  const results = new Array(candles.length).fill(null);

  for (let i = 0; i < smaValues.length; i++) {
    const idx = i + offset;
    const ma = round(smaValues[i]);
    const close = closes[idx];
    let cross = null;

    const prevEntry = idx > 0 ? results[idx - 1] : null;
    if (prevEntry?.ma != null) {
      const prevClose = closes[idx - 1];
      const prevMa = prevEntry.ma;
      const wasBelowOrOn = prevClose <= prevMa;
      const wasAboveOrOn = prevClose >= prevMa;
      const nowAbove = close > ma;
      const nowBelow = close < ma;
      if (wasBelowOrOn && nowAbove) {
        cross = 'above';
      } else if (wasAboveOrOn && nowBelow) {
        cross = 'below';
      }
    }

    results[idx] = { ma, cross };
  }

  return results;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
