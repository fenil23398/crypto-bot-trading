import config from '../config/index.js';
import logger from '../utils/logger.js';

const { bridgeUrl, bridgeSecret } = config.ostium;

function base() {
  return String(bridgeUrl || '').replace(/\/$/, '');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (bridgeSecret) h['X-Ostium-Bridge-Secret'] = bridgeSecret;
  return h;
}

async function bridgeFetch(path, { method = 'GET', body } = {}) {
  const url = `${base()}${path}`;
  logger.debug(`OSTIUM bridge ${method} ${path}`);

  const res = await fetch(url, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data.detail || data.error || data.message || text || res.statusText;
    logger.error(`OSTIUM bridge error ${res.status}`, { path, msg });
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  return data;
}

/** Leverage is set per trade on Ostium; Node still calls this for a uniform bot flow. */
export async function setLeverage(_symbol, _leverage) {
  return { ok: true };
}

/**
 * Positions in a Binance-like shape (see ostium-bridge) for the bot + UI.
 */
export async function getPositions(symbol) {
  const q = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
  const data = await bridgeFetch(`/positions${q}`);
  return Array.isArray(data.positions) ? data.positions : [];
}

/**
 * Close all open trades on the Ostium pair that maps to this symbol.
 */
export async function closeAllForSymbol(symbol) {
  return bridgeFetch('/v1/close-all-for-symbol', {
    method: 'POST',
    body: { symbol },
  });
}

/**
 * Open a market position with TP/SL prices (single on-chain openTrade).
 */
export async function openMarket({ symbol, side, collateral, leverage, stopLoss, takeProfit, slippagePercent }) {
  const body = {
    symbol,
    side,
    collateral,
    leverage,
    stop_loss: stopLoss,
    take_profit: takeProfit,
  };
  if (slippagePercent != null) body.slippage_percent = slippagePercent;
  return bridgeFetch('/v1/open-market', { method: 'POST', body });
}

export function isConfigured() {
  return !!base();
}
