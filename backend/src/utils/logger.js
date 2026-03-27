import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `${timestamp} ${level}: ${message}\n${stack}`
      : `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: config.logLevel,
  format: config.env === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
