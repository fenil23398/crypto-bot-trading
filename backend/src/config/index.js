import 'dotenv/config';

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  port: parseInt(process.env.PORT, 10) || 3000,

  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-bot',
  },

  binance: {
    baseUrl: process.env.BINANCE_BASE_URL || 'https://data-api.binance.vision',
    symbols: ['BTCUSDT', 'ETHUSDT'],
    interval: '1h',
  },

  sync: {
    cron: process.env.SYNC_CRON || '0 */1 * * *',
    backfillDays: parseInt(process.env.BACKFILL_DAYS, 10) || 30,
  },

  supertrend: {
    period: parseInt(process.env.SUPERTREND_PERIOD, 10) || 10,
    multiplier: parseFloat(process.env.SUPERTREND_MULTIPLIER) || 3,
  },

  macd: {
    fastPeriod: parseInt(process.env.MACD_FAST_PERIOD, 10) || 12,
    slowPeriod: parseInt(process.env.MACD_SLOW_PERIOD, 10) || 26,
    signalPeriod: parseInt(process.env.MACD_SIGNAL_PERIOD, 10) || 9,
  },

  rsiEma: {
    rsiPeriod: parseInt(process.env.RSI_PERIOD, 10) || 14,
    emaPeriod: parseInt(process.env.EMA_PERIOD, 10) || 200,
    oversold: parseInt(process.env.RSI_OVERSOLD, 10) || 30,
    overbought: parseInt(process.env.RSI_OVERBOUGHT, 10) || 70,
  },

  ma9: {
    period: parseInt(process.env.MA9_PERIOD, 10) || 9,
    /** 'sma' only for now (matches calculateMA9) */
    type: (process.env.MA9_TYPE || 'sma').toLowerCase(),
  },

  rsiLevels: {
    period: parseInt(process.env.RSI_LEVELS_PERIOD, 10) || 14,
    buyThreshold: parseFloat(process.env.RSI_LEVELS_BUY) || 60,
    sellThreshold: parseFloat(process.env.RSI_LEVELS_SELL) || 40,
  },

  /** ADX trend filter: only take strategy signals when ADX >= threshold */
  adxFilter: {
    enabled: process.env.ADX_FILTER_ENABLED !== 'false',
    period: parseInt(process.env.ADX_PERIOD, 10) || 14,
    threshold: parseFloat(process.env.ADX_THRESHOLD) || 25,
  },

  aster: {
    apiKey: process.env.ASTER_API_KEY || '',
    secretKey: process.env.ASTER_SECRET_KEY || '',
    baseUrl: process.env.ASTER_BASE_URL || 'https://fapi.asterdex.com',
    leverage: parseInt(process.env.ASTER_LEVERAGE, 10) || 3,
    tradeUsdt: parseFloat(process.env.ASTER_TRADE_USDT) || 100,
    slPercent: parseFloat(process.env.ASTER_SL_PERCENT) || 25,
    tpPercent: parseFloat(process.env.ASTER_TP_PERCENT) || 25,
  },

  ostium: {
    /** Local ostium-bridge (Python SDK) — see repo /ostium-bridge */
    bridgeUrl: process.env.OSTIUM_BRIDGE_URL || 'http://127.0.0.1:5055',
    bridgeSecret: process.env.OSTIUM_BRIDGE_SECRET || '',
    leverage: parseInt(process.env.OSTIUM_LEVERAGE, 10) || 3,
    tradeUsdt: parseFloat(process.env.OSTIUM_TRADE_USDT) || 100,
    slPercent: parseFloat(process.env.OSTIUM_SL_PERCENT) || 25,
    tpPercent: parseFloat(process.env.OSTIUM_TP_PERCENT) || 25,
  },
});

export default config;
