import { ATR } from 'technicalindicators';

/**
 * Computes SuperTrend values for an array of candles.
 *
 * SuperTrend = ATR-based trailing stop that flips direction
 * when price crosses the band.
 *
 * @param {Array} candles - Sorted ascending by openTime. Each must have { high, low, close }.
 * @param {number} period - ATR lookback period (default 10)
 * @param {number} multiplier - ATR multiplier (default 3)
 * @returns {Array} Array of { supertrend, direction, upperBand, lowerBand } aligned to candles (first `period` entries are null)
 */
export function calculateSuperTrend(candles, period = 10, multiplier = 3) {
  if (candles.length < period + 1) {
    return [];
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);

  const atrValues = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period,
  });

  const offset = candles.length - atrValues.length;
  const results = new Array(candles.length).fill(null);

  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSuperTrend = 0;
  let prevDirection = 1; // 1 = bullish, -1 = bearish

  for (let i = 0; i < atrValues.length; i++) {
    const idx = i + offset;
    const hl2 = (highs[idx] + lows[idx]) / 2;
    const atr = atrValues[i];

    let basicUpperBand = hl2 + multiplier * atr;
    let basicLowerBand = hl2 - multiplier * atr;

    let finalUpperBand =
      i === 0
        ? basicUpperBand
        : basicUpperBand < prevUpperBand || closes[idx - 1] > prevUpperBand
          ? basicUpperBand
          : prevUpperBand;

    let finalLowerBand =
      i === 0
        ? basicLowerBand
        : basicLowerBand > prevLowerBand || closes[idx - 1] < prevLowerBand
          ? basicLowerBand
          : prevLowerBand;

    let direction;
    let supertrend;

    if (i === 0) {
      direction = closes[idx] > finalUpperBand ? 1 : -1;
      supertrend = direction === 1 ? finalLowerBand : finalUpperBand;
    } else if (prevSuperTrend === prevUpperBand) {
      if (closes[idx] > finalUpperBand) {
        direction = 1;
        supertrend = finalLowerBand;
      } else {
        direction = -1;
        supertrend = finalUpperBand;
      }
    } else {
      if (closes[idx] < finalLowerBand) {
        direction = -1;
        supertrend = finalUpperBand;
      } else {
        direction = 1;
        supertrend = finalLowerBand;
      }
    }

    results[idx] = {
      supertrend: round(supertrend),
      direction,
      upperBand: round(finalUpperBand),
      lowerBand: round(finalLowerBand),
      prevDirection: i === 0 ? null : prevDirection,
    };

    prevUpperBand = finalUpperBand;
    prevLowerBand = finalLowerBand;
    prevSuperTrend = supertrend;
    prevDirection = direction;
  }

  return results;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
