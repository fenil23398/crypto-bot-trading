import { calculateSuperTrend } from '../indicators/supertrend.js';
import config from '../../config/index.js';

export const name = 'supertrend';
export const displayName = 'SuperTrend';
export const description =
  'ATR-based trailing stop — signals when SuperTrend flips on the latest closed bar or the prior bar (aligned with chart when a new candle closes)';
export const requiredCandles = 60;

function dirLabel(d) {
  return d === 1 ? 'BULLISH' : 'BEARISH';
}

/**
 * SuperTrend flips on the bar where `direction` changes vs the previous bar.
 * When a new hour syncs in, the flip may be on the *previous* closed bar while the
 * newest bar continues the new trend; comparing only (latest, latest-1) misses that.
 *
 * @param {number} [length] — use first `length` bars only (prefix of `results` / `candles`).
 *   Omit to use full series (live `evaluate`). Backtest passes growing `n` to match each closed bar.
 */
export function pickSuperTrendFlipAtSeriesEnd(results, candles, length) {
  const n = length ?? candles.length;
  const latestIdx = n - 1;
  const prevIdx = n - 2;
  const beforePrevIdx = n - 3;

  const latest = results[latestIdx];
  const prev = results[prevIdx];
  const beforePrev = beforePrevIdx >= 0 ? results[beforePrevIdx] : null;

  if (!latest || !prev) {
    return { error: 'computation_failed' };
  }

  if (prev.direction !== latest.direction) {
    return {
      flipIndex: latestIdx,
      signalCandle: candles[latestIdx],
      lineAfterFlip: latest,
      lineBeforeFlip: prev,
      flipOn: 'latest',
    };
  }

  if (beforePrev && prev.direction !== beforePrev.direction) {
    return {
      flipIndex: prevIdx,
      signalCandle: candles[prevIdx],
      lineAfterFlip: prev,
      lineBeforeFlip: beforePrev,
      flipOn: 'previous',
    };
  }

  return {
    noFlip: true,
    latest,
    prev,
    latestCandle: candles[latestIdx],
    prevCandle: candles[prevIdx],
  };
}

export function evaluate(candles) {
  const { period, multiplier } = config.supertrend;

  if (candles.length < period + 2) {
    return { signal: null, reason: 'not_enough_data' };
  }

  const results = calculateSuperTrend(candles, period, multiplier);
  const picked = pickSuperTrendFlipAtSeriesEnd(results, candles);

  if (picked.error) {
    return { signal: null, reason: picked.error };
  }

  if (picked.noFlip) {
    const { latest, prev, latestCandle, prevCandle } = picked;
    const meta = {
      price: latestCandle.close,
      direction: dirLabel(latest.direction),
      supertrend: latest.supertrend,
      previousBar: {
        openTime: prevCandle.openTime.toISOString(),
        direction: dirLabel(prev.direction),
      },
      latestBar: {
        openTime: latestCandle.openTime.toISOString(),
        direction: dirLabel(latest.direction),
      },
    };
    const indicators = {
      supertrend: latest.supertrend,
      direction: latest.direction,
      prevDirection: prev.direction,
      upperBand: latest.upperBand,
      lowerBand: latest.lowerBand,
      period,
      multiplier,
    };
    return { signal: null, reason: 'no_direction_change', meta, indicators };
  }

  const { signalCandle, lineAfterFlip, lineBeforeFlip, flipOn, flipIndex } = picked;
  const action = lineAfterFlip.direction === 1 ? 'BUY' : 'SELL';

  const indicators = {
    supertrend: lineAfterFlip.supertrend,
    direction: lineAfterFlip.direction,
    prevDirection: lineBeforeFlip.direction,
    upperBand: lineAfterFlip.upperBand,
    lowerBand: lineAfterFlip.lowerBand,
    period,
    multiplier,
    flipOn,
  };

  const meta = {
    price: signalCandle.close,
    direction: dirLabel(lineAfterFlip.direction),
    supertrend: lineAfterFlip.supertrend,
    flipOn,
    signalBarOpenTime: signalCandle.openTime.toISOString(),
    previousBar: {
      openTime: flipIndex >= 1 ? candles[flipIndex - 1].openTime.toISOString() : null,
      direction: dirLabel(lineBeforeFlip.direction),
    },
    latestBar: {
      openTime: candles[candles.length - 1].openTime.toISOString(),
      direction: dirLabel(results[candles.length - 1].direction),
    },
  };

  return {
    signal: action,
    meta,
    indicators,
    /** Bar where the flip occurred — used for dedupe, DB, and order price */
    signalCandle,
  };
}
