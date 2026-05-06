import { Router } from 'express';
import Order from '../models/order.model.js';
import * as aster from '../services/aster.service.js';
import * as ostium from '../services/ostium.service.js';

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
 * Fetch open positions. Query: ?platform=aster|ostium (default aster), ?symbol=BTCUSDT
 */
router.get('/positions', async (req, res) => {
  const platform = req.query.platform === 'ostium' ? 'ostium' : 'aster';
  const symbol = req.query.symbol?.toUpperCase();

  if (platform === 'ostium') {
    if (!ostium.isConfigured()) {
      return res.status(400).json({ error: 'OSTIUM API keys not configured' });
    }
  } else if (!aster.isConfigured()) {
    return res.status(400).json({ error: 'ASTER API keys not configured' });
  }

  try {
    const positions =
      platform === 'ostium'
        ? await ostium.getPositions(symbol)
        : await aster.getPositions(symbol);
    res.json({ platform, count: positions.length, positions });
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
