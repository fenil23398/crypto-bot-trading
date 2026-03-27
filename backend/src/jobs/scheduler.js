import cron from 'node-cron';
import config from '../config/index.js';
import { syncAllSymbols } from '../services/candle-sync.service.js';
import { evaluateActiveBots } from '../services/bot-manager.service.js';
import logger from '../utils/logger.js';

let task = null;

async function runPipeline() {
  await syncAllSymbols();
  await evaluateActiveBots();
}

export function startScheduler() {
  if (task) {
    logger.warn('Scheduler already running — skipping duplicate start');
    return;
  }

  logger.info(`Scheduling pipeline with cron: ${config.sync.cron}`);

  task = cron.schedule(config.sync.cron, async () => {
    logger.info('Cron triggered — starting pipeline');
    try {
      await runPipeline();
    } catch (err) {
      logger.error('Scheduled pipeline encountered an error', {
        error: err.message,
      });
    }
  });

  task.start();
  logger.info('Scheduler started');
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info('Scheduler stopped');
  }
}
