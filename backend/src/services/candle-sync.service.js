import Candle from '../models/candle.model.js';
import SyncLog from '../models/sync-log.model.js';
import { fetchKlines } from './binance.service.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const MS_PER_DAY = 86_400_000;

/**
 * Determines the start time for fetching candles.
 * Uses the most recent candle's openTime if data exists,
 * otherwise falls back to BACKFILL_DAYS ago.
 */
async function resolveStartTime(symbol, interval) {
  const latest = await Candle.findOne({ symbol, interval })
    .sort({ openTime: -1 })
    .lean();

  if (latest) {
    return latest.openTime.getTime();
  }

  return Date.now() - config.sync.backfillDays * MS_PER_DAY;
}

/**
 * Upserts candles into MongoDB using bulkWrite for performance.
 * Returns the number of upserted/modified documents.
 */
async function upsertCandles(candles) {
  if (!candles.length) return 0;

  const ops = candles.map((c) => ({
    updateOne: {
      filter: {
        symbol: c.symbol,
        interval: c.interval,
        openTime: c.openTime,
      },
      update: { $set: c },
      upsert: true,
    },
  }));

  const result = await Candle.bulkWrite(ops, { ordered: false });
  return result.upsertedCount + result.modifiedCount;
}

/**
 * Creates a sync log entry after each sync attempt.
 */
async function writeSyncLog(symbol, interval, status, extra = {}) {
  const totalCandles = await Candle.countDocuments({ symbol, interval });

  await SyncLog.create({
    symbol,
    interval,
    lastSyncAt: new Date(),
    totalCandles,
    status,
    ...extra,
  });
}

/**
 * Syncs candles for a single symbol.
 * Fetches from last known candle (or backfill window) up to now.
 */
export async function syncSymbol(symbol, interval) {
  const start = performance.now();

  try {
    const startTime = await resolveStartTime(symbol, interval);
    const endTime = Date.now();

    logger.info(`Syncing ${symbol} ${interval}`, {
      from: new Date(startTime).toISOString(),
      to: new Date(endTime).toISOString(),
    });

    const candles = await fetchKlines(symbol, interval, startTime, endTime);
    const upserted = await upsertCandles(candles);
    const durationMs = Math.round(performance.now() - start);

    logger.info(`Sync complete for ${symbol}`, {
      upserted,
      durationMs,
    });

    await writeSyncLog(symbol, interval, 'success', {
      candlesUpserted: upserted,
      durationMs,
    });

    return { symbol, upserted, durationMs };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    logger.error(`Sync failed for ${symbol}`, {
      error: err.message,
      durationMs,
    });

    await writeSyncLog(symbol, interval, 'error', {
      error: err.message,
      durationMs,
    });

    throw err;
  }
}

/**
 * Syncs all configured symbols sequentially.
 * Continues to the next symbol even if one fails.
 */
export async function syncAllSymbols() {
  const { symbols, interval } = config.binance;
  const results = [];

  logger.info('Starting sync for all symbols', { symbols, interval });

  for (const symbol of symbols) {
    try {
      const result = await syncSymbol(symbol, interval);
      results.push(result);
    } catch {
      results.push({ symbol, error: true });
    }
  }

  logger.info('All symbols sync finished', {
    results: results.map((r) => `${r.symbol}: ${r.error ? 'FAIL' : 'OK'}`),
  });

  return results;
}
