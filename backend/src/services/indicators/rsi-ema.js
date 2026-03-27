import { RSI, EMA } from 'technicalindicators';

/**
 * Computes RSI + EMA combo and detects reversal signals.
 *
 * Strategy:
 *   - RSI crosses above oversold (30) AND price > EMA → BUY
 *   - RSI crosses below overbought (70) AND price < EMA → SELL
 *
 * This combines momentum (RSI) with trend direction (EMA) to filter
 * false signals — only buys in uptrends and sells in downtrends.
 *
 * @param {Array} candles - Sorted ascending. Each must have { close }.
 * @param {number} rsiPeriod - RSI lookback (default 14)
 * @param {number} emaPeriod - EMA lookback (default 200)
 * @param {number} oversold - RSI oversold threshold (default 30)
 * @param {number} overbought - RSI overbought threshold (default 70)
 * @returns {Array} Aligned to candles (nulls where not enough data)
 */
export function calculateRSIEMA(
  candles,
  rsiPeriod = 14,
  emaPeriod = 200,
  oversold = 30,
  overbought = 70,
) {
  const closes = candles.map((c) => c.close);

  const rsiValues = RSI.calculate({ values: closes, period: rsiPeriod });
  const emaValues = EMA.calculate({ values: closes, period: emaPeriod });

  const rsiOffset = candles.length - rsiValues.length;
  const emaOffset = candles.length - emaValues.length;

  const results = new Array(candles.length).fill(null);
  let prevZone = null; // 'oversold' | 'overbought' | 'neutral'

  for (let idx = 0; idx < candles.length; idx++) {
    const rsiIdx = idx - rsiOffset;
    const emaIdx = idx - emaOffset;

    if (rsiIdx < 0 || emaIdx < 0) continue;

    const rsi = rsiValues[rsiIdx];
    const ema = emaValues[emaIdx];
    const close = closes[idx];

    const zone = rsi <= oversold ? 'oversold' : rsi >= overbought ? 'overbought' : 'neutral';

    let signal = null;

    if (prevZone === 'oversold' && zone === 'neutral' && close > ema) {
      signal = 'BUY';
    } else if (prevZone === 'overbought' && zone === 'neutral' && close < ema) {
      signal = 'SELL';
    }

    results[idx] = {
      rsi: round(rsi),
      ema: round(ema),
      zone,
      signal,
      aboveEma: close > ema,
    };

    prevZone = zone;
  }

  return results;
}

function round(n) {
  return n != null ? Math.round(n * 100) / 100 : null;
}
