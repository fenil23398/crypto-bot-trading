import { connectDatabase, disconnectDatabase } from '../config/database.js';
import config from '../config/index.js';
import Candle from '../models/candle.model.js';
import logger from '../utils/logger.js';
 
const MS_PER_DAY = 86_400_000;
 
function parseArgs(argv) {
  const args = {
    days: undefined,
    symbol: undefined,
    interval: undefined,
    dryRun: false,
  };
 
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '--dryrun') {
      args.dryRun = true;
      continue;
    }
 
    if (a === '--days') {
      args.days = Number(argv[i + 1]);
      i++;
      continue;
    }
    if (a.startsWith('--days=')) {
      args.days = Number(a.split('=')[1]);
      continue;
    }
 
    if (a === '--symbol') {
      args.symbol = argv[i + 1];
      i++;
      continue;
    }
    if (a.startsWith('--symbol=')) {
      args.symbol = a.split('=')[1];
      continue;
    }
 
    if (a === '--interval') {
      args.interval = argv[i + 1];
      i++;
      continue;
    }
    if (a.startsWith('--interval=')) {
      args.interval = a.split('=')[1];
      continue;
    }
 
    if (a === '--help' || a === '-h') {
      // eslint-disable-next-line no-console
      console.log(`
Prune old candle data from MongoDB.

Usage:
  node src/scripts/prune-candles.js [--days N] [--symbol BTCUSDT] [--interval 1h] [--dry-run]

Notes:
  - Deletes candles where openTime < (now - N days)
  - Default N comes from BACKFILL_DAYS (config.sync.backfillDays)
  - Use --dry-run to only count matching docs
`);
      process.exit(0);
    }
  }
 
  return args;
}
 
async function main() {
  const args = parseArgs(process.argv);
  const days = Number.isFinite(args.days) && args.days > 0 ? args.days : config.sync.backfillDays;
 
  const cutoff = new Date(Date.now() - days * MS_PER_DAY);
  const filter = {
    openTime: { $lt: cutoff },
    ...(args.symbol ? { symbol: args.symbol } : {}),
    ...(args.interval ? { interval: args.interval } : {}),
  };
 
  logger.info('Candle prune starting', {
    days,
    cutoff: cutoff.toISOString(),
    symbol: args.symbol ?? 'ALL',
    interval: args.interval ?? 'ALL',
    dryRun: args.dryRun,
  });
 
  await connectDatabase();
 
  try {
    const matchCount = await Candle.countDocuments(filter);
    if (args.dryRun) {
      logger.info('Dry-run complete (no deletions)', { matching: matchCount });
      return;
    }
 
    const result = await Candle.deleteMany(filter);
    logger.info('Prune complete', { deleted: result.deletedCount ?? 0, previouslyMatching: matchCount });
  } finally {
    await disconnectDatabase();
  }
}
 
main().catch((err) => {
  logger.error('Prune failed', { error: err?.message, stack: err?.stack });
  process.exit(1);
});

