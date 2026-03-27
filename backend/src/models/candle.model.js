import mongoose from 'mongoose';

const candleSchema = new mongoose.Schema(
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
    openTime: {
      type: Date,
      required: true,
    },
    closeTime: {
      type: Date,
      required: true,
    },
    open: {
      type: Number,
      required: true,
    },
    high: {
      type: Number,
      required: true,
    },
    low: {
      type: Number,
      required: true,
    },
    close: {
      type: Number,
      required: true,
    },
    volume: {
      type: Number,
      required: true,
    },
    quoteVolume: {
      type: Number,
      required: true,
    },
    trades: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

candleSchema.index({ symbol: 1, interval: 1, openTime: 1 }, { unique: true });

candleSchema.index({ symbol: 1, interval: 1, openTime: -1 });

const Candle = mongoose.model('Candle', candleSchema);

export default Candle;
