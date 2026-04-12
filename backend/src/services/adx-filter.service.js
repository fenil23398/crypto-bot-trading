import { calculateADXAligned } from './indicators/adx.js';
import config from '../config/index.js';

/**
 * Minimum bars after ADX starts printing — Wilder smoothing needs warmup.
 */
export function adxWarmupBars(period) {
  return period * 2 + 5;
}

/**
 * Resolve ADX filter options (env defaults + optional API overrides for backtest).
 */
export function resolveAdxFilterOptions(overrides = {}) {
  const base = config.adxFilter;
  return {
    enabled:
      overrides.adxFilterEnabled !== undefined
        ? Boolean(overrides.adxFilterEnabled)
        : base.enabled,
    period:
      overrides.adxPeriod != null
        ? Math.max(2, parseInt(overrides.adxPeriod, 10) || base.period)
        : base.period,
    threshold:
      overrides.adxThreshold != null
        ? Math.max(0, parseFloat(overrides.adxThreshold) || base.threshold)
        : base.threshold,
  };
}

/**
 * ADX at a specific bar index over `candles` (full-series Wilder ADX, same as legacy backtest).
 */
export function passesAdxTrendFilterAtBar(candles, barIndex, options = null) {
  const opts = options ?? resolveAdxFilterOptions();
  if (!opts.enabled) {
    return { pass: true, reason: 'adx_filter_disabled', snapshot: null };
  }

  if (candles.length < adxWarmupBars(opts.period)) {
    return { pass: false, reason: 'adx_not_enough_bars', snapshot: null };
  }

  const aligned = calculateADXAligned(candles, opts.period);
  const row = aligned[barIndex] ?? null;

  if (!row) {
    return { pass: false, reason: 'adx_no_value', snapshot: null };
  }

  if (row.adx < opts.threshold) {
    return {
      pass: false,
      reason: 'adx_below_threshold',
      snapshot: { ...row, threshold: opts.threshold, period: opts.period, barIndex },
    };
  }

  return {
    pass: true,
    reason: 'adx_ok',
    snapshot: { ...row, threshold: opts.threshold, period: opts.period, barIndex },
  };
}

/**
 * Live bot (default): newest bar in `candles` must have ADX >= threshold.
 */
export function passesAdxTrendFilter(candles, options = null) {
  if (!candles?.length) {
    return { pass: false, reason: 'adx_not_enough_bars', snapshot: null };
  }
  return passesAdxTrendFilterAtBar(candles, candles.length - 1, options);
}

/**
 * Backtest: keep only signals whose evaluation bar has ADX >= threshold.
 */
export function filterSignalsByAdx(candles, signals, options = null) {
  const opts = options ?? resolveAdxFilterOptions(options);
  if (!opts.enabled) {
    return {
      signals,
      rawCount: signals.length,
      filteredCount: 0,
      adxAligned: null,
    };
  }

  const adxAligned = calculateADXAligned(candles, opts.period);
  const filtered = [];

  for (const sig of signals) {
    const adxIdx = sig.adxEvaluationIndex ?? sig.index;
    const row = adxAligned[adxIdx];
    if (row && row.adx >= opts.threshold) {
      filtered.push(sig);
    }
  }

  return {
    signals: filtered,
    rawCount: signals.length,
    filteredCount: signals.length - filtered.length,
    adxAligned,
  };
}
