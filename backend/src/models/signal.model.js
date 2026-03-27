import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      index: true,
    },
    interval: {
      type: String,
      required: true,
    },
    strategy: {
      type: String,
      required: true,
      enum: ['supertrend', 'macd', 'rsi_ema', 'ma9', 'rsi_levels'],
    },
    action: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL'],
    },
    price: {
      type: Number,
      required: true,
    },
    candleOpenTime: {
      type: Date,
      required: true,
    },
    indicators: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    executed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

signalSchema.index({ symbol: 1, strategy: 1, candleOpenTime: 1 }, { unique: true });
signalSchema.index({ createdAt: -1 });

const Signal = mongoose.model('Signal', signalSchema);

export default Signal;
