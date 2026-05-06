import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    strategy: {
      type: String,
      required: true,
      enum: ['supertrend', 'macd', 'rsi_ema', 'ma9', 'rsi_levels', 'system'],
      index: true,
    },
    signalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Signal',
    },
    symbol: {
      type: String,
      required: true,
    },
    side: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL'],
    },
    type: {
      type: String,
      required: true,
      enum: ['MARKET', 'STOP_MARKET', 'TAKE_PROFIT_MARKET'],
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    stopPrice: {
      type: Number,
      default: null,
    },
    leverage: {
      type: Number,
      default: 3,
    },
    status: {
      type: String,
      enum: ['NEW', 'FILLED', 'CANCELED', 'FAILED'],
      default: 'NEW',
    },
    asterOrderId: {
      type: String,
      default: null,
    },
    ostiumOrderId: {
      type: String,
      default: null,
    },
    parentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ strategy: 1, symbol: 1, createdAt: -1 });
orderSchema.index({ asterOrderId: 1 });
orderSchema.index({ ostiumOrderId: 1 });
orderSchema.index({ parentOrderId: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
