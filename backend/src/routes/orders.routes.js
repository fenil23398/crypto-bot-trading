import { Router } from 'express';
import Order from '../models/order.model.js';
import * as aster from '../services/aster.service.js';

const router = Router();

/**
 * GET /api/orders
 * List orders with optional filters: ?strategy=supertrend&symbol=BTCUSDT&limit=50
 */
router.get('/', async (req, res) => {
  const query = {};
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  if (req.query.strategy) query.strategy = req.query.strategy;
  if (req.query.symbol) query.symbol = req.query.symbol.toUpperCase();

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ count: orders.length, orders });
});

/**
 * GET /api/orders/positions
 * Fetch current open positions from ASTER Dex.
 */
router.get('/positions', async (req, res) => {
  if (!aster.isConfigured()) {
    return res.status(400).json({ error: 'ASTER API keys not configured' });
  }

  try {
    const positions = await aster.getPositions(req.query.symbol?.toUpperCase());
    res.json({ count: positions.length, positions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/:orderId
 * Get a single order by MongoDB ID.
 */
router.get('/:orderId', async (req, res) => {
  const order = await Order.findById(req.params.orderId).lean();
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

export default router;
