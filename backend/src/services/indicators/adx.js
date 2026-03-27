import { ADX } from 'technicalindicators';

/**
 * Wilder ADX aligned to candle indices (null where not enough data).
 *
 * @param {Array} candles - Ascending; each { high, low, close }
 * @param {number} period - ADX period (default 14)
 * @returns {Array<{ adx: number, pdi: number, mdi: number } | null>}
 */
export function calculateADXAligned(candles, period = 14) {
  if (!candles?.length || period < 2) {
    return [];
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);

  const adxResults = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period,
  });

  const offset = candles.length - adxResults.length;
  const aligned = new Array(candles.length).fill(null);

  for (let i = 0; i < adxResults.length; i++) {
    const idx = i + offset;
    const row = adxResults[i];
    if (row && typeof row.adx === 'number' && !Number.isNaN(row.adx)) {
      aligned[idx] = {
        adx: round(row.adx),
        pdi: round(row.pdi),
        mdi: round(row.mdi),
      };
    }
  }

  return aligned;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
