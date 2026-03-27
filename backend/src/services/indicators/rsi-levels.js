import { RSI } from 'technicalindicators';

/**
 * RSI with 60/40 level crossover detection.
 * - Cross above buyThreshold (60) → BUY
 * - Cross below sellThreshold (40) → SELL (short)
 *
 * @param {Array} candles - Sorted ascending. Each must have { close }.
 * @param {number} period - RSI lookback (default 14)
 * @param {number} buyThreshold - RSI level for BUY signal (default 60)
 * @param {number} sellThreshold - RSI level for SELL signal (default 40)
 * @returns {Array} Aligned to candles (nulls where not enough data)
 */
export function calculateRSILevels(
  candles,
  period = 14,
  buyThreshold = 60,
  sellThreshold = 40,
) {
  const closes = candles.map((c) => c.close);
  const rsiValues = RSI.calculate({ values: closes, period });
  const rsiOffset = candles.length - rsiValues.length;

  const results = new Array(candles.length).fill(null);

  for (let idx = 0; idx < candles.length; idx++) {
    const rsiIdx = idx - rsiOffset;
    if (rsiIdx < 1) continue; // need previous bar for crossover

    const rsi = rsiValues[rsiIdx];
    const prevRsi = rsiValues[rsiIdx - 1];

    let signal = null;

    // Cross above buyThreshold: prev <= threshold and current > threshold
    if (prevRsi <= buyThreshold && rsi > buyThreshold) {
      signal = 'BUY';
    }

    // Cross below sellThreshold: prev >= threshold and current < threshold
    if (prevRsi >= sellThreshold && rsi < sellThreshold) {
      signal = 'SELL';
    }

    results[idx] = {
      rsi: round(rsi),
      signal,
      buyThreshold,
      sellThreshold,
    };
  }

  return results;
}

function round(n) {
  return n != null ? Math.round(n * 100) / 100 : null;
}
