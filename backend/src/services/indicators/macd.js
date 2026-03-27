import { MACD } from 'technicalindicators';

/**
 * Computes MACD and detects crossover signals.
 *
 * MACD crossover strategy:
 *   - MACD line crosses ABOVE signal line → BUY (bullish momentum)
 *   - MACD line crosses BELOW signal line → SELL (bearish momentum)
 *
 * @param {Array} candles - Sorted ascending by openTime. Each must have { close }.
 * @param {number} fastPeriod - Fast EMA period (default 12)
 * @param {number} slowPeriod - Slow EMA period (default 26)
 * @param {number} signalPeriod - Signal line period (default 9)
 * @returns {Array} Aligned to candles (nulls where not enough data)
 */
export function calculateMACD(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const closes = candles.map((c) => c.close);

  const macdResults = MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const offset = candles.length - macdResults.length;
  const results = new Array(candles.length).fill(null);

  let prevPosition = null; // 'above' | 'below'

  for (let i = 0; i < macdResults.length; i++) {
    const idx = i + offset;
    const { MACD: macdLine, signal, histogram } = macdResults[i];

    if (macdLine == null || signal == null) continue;

    const currentPosition = macdLine >= signal ? 'above' : 'below';
    const crossover =
      prevPosition && prevPosition !== currentPosition ? currentPosition : null;

    results[idx] = {
      macd: round(macdLine),
      signal: round(signal),
      histogram: round(histogram),
      position: currentPosition,
      crossover,
    };

    prevPosition = currentPosition;
  }

  return results;
}

function round(n) {
  return n != null ? Math.round(n * 100) / 100 : null;
}
