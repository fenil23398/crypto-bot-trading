import { Router } from 'express';
import botsRouter from './bots.routes.js';
import ordersRouter from './orders.routes.js';

const router = Router();

router.use('/bots', botsRouter);
router.use('/orders', ordersRouter);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export default router;
