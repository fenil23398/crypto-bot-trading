import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

let isConnected = false;

export async function connectDatabase() {
  if (isConnected) return;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(config.mongo.uri);
}

export async function disconnectDatabase() {
  if (!isConnected) return;
  await mongoose.disconnect();
}
