import express from 'express';
import cors from 'cors';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { syncAllSymbols } from './services/candle-sync.service.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import apiRouter from './routes/index.js';
import config from './config/index.js';
import logger from './utils/logger.js';

async function main() {
  logger.info('Trading Bot Backend starting...');

  await connectDatabase();

  logger.info('Running initial data sync...');
  await syncAllSymbols();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRouter);

  app.listen(config.port, () => {
    logger.info(`API server listening on http://localhost:${config.port}`);
  });

  startScheduler();

  logger.info('Backend is running. Start bots via API:');
  logger.info(`  POST http://localhost:${config.port}/api/bots/supertrend/start`);
  logger.info(`  POST http://localhost:${config.port}/api/bots/macd/start`);
  logger.info(`  POST http://localhost:${config.port}/api/bots/rsi_ema/start`);
  logger.info(`  POST http://localhost:${config.port}/api/bots/ma9/start`);
}

function shutdown(signal) {
  return async () => {
    logger.info(`Received ${signal} — shutting down gracefully`);
    stopScheduler();
    await disconnectDatabase();
    process.exit(0);
  };
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err?.message, stack: err?.stack });
});

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});
