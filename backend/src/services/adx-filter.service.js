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
 * Live bot: latest bar must have ADX >= threshold (trend strong enough).
 */
export function passesAdxTrendFilter(candles, options = null) {
  const opts = options ?? resolveAdxFilterOptions();
  if (!opts.enabled) {
    return { pass: true, reason: 'adx_filter_disabled', snapshot: null };
  }

  if (candles.length < adxWarmupBars(opts.period)) {
    return { pass: false, reason: 'adx_not_enough_bars', snapshot: null };
  }

  const aligned = calculateADXAligned(candles, opts.period);
  const latest = aligned[candles.length - 1];

  if (!latest) {
    return { pass: false, reason: 'adx_no_value', snapshot: null };
  }

  if (latest.adx < opts.threshold) {
    return {
      pass: false,
      reason: 'adx_below_threshold',
      snapshot: { ...latest, threshold: opts.threshold, period: opts.period },
    };
  }

  return {
    pass: true,
    reason: 'adx_ok',
    snapshot: { ...latest, threshold: opts.threshold, period: opts.period },
  };
}

/**
 * Backtest: keep only signals whose bar has ADX >= threshold.
 */
export function filterSignalsByAdx(candles, signals, options = null) {
  const opts = options ?? resolveAdxFilterOptions();
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
    const row = adxAligned[sig.index];
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
