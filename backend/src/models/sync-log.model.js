import mongoose from 'mongoose';

const syncLogSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
    },
    interval: {
      type: String,
      required: true,
    },
    lastSyncAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    candlesUpserted: {
      type: Number,
      default: 0,
    },
    totalCandles: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['success', 'error'],
      required: true,
    },
    error: {
      type: String,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

syncLogSchema.index({ symbol: 1, interval: 1, createdAt: -1 });

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

export default SyncLog;
