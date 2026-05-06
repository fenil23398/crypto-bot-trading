import mongoose from 'mongoose';

const runtimeParamsSchema = new mongoose.Schema(
  {
    tradingPlatform: {
      type: String,
      enum: ['aster', 'ostium'],
      default: 'aster',
    },
    leverage: { type: Number, required: true, min: 1 },
    tradeUsdt: { type: Number, required: true, min: 1 },
    slPercent: { type: Number, required: true, min: 0 },
    tpPercent: { type: Number, required: true, min: 0 },
    adxFilterEnabled: { type: Boolean, required: true },
    adxPeriod: { type: Number, required: true, min: 2 },
    adxThreshold: { type: Number, required: true, min: 0 },
    symbols: {
      type: [String],
      required: true,
      default: [],
    },
  },
  { _id: false },
);

const botConfigSchema = new mongoose.Schema(
  {
    strategy: {
      type: String,
      required: true,
      unique: true,
      index: true,
      enum: ['supertrend', 'macd', 'rsi_ema', 'ma9', 'rsi_levels'],
    },
    runtimeParams: {
      type: runtimeParamsSchema,
      required: true,
    },
    lastStartedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const BotConfig = mongoose.model('BotConfig', botConfigSchema);

export default BotConfig;
