import mongoose from 'mongoose';

const botLogSchema = new mongoose.Schema(
  {
    strategy: {
      type: String,
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
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
    status: {
      type: String,
      enum: ['signal_generated', 'order_placed', 'order_failed'],
      default: 'signal_generated',
    },
    message: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

botLogSchema.index({ strategy: 1, createdAt: -1 });
botLogSchema.index({ strategy: 1, symbol: 1, createdAt: -1 });

const BotLog = mongoose.model('BotLog', botLogSchema);

export default BotLog;
