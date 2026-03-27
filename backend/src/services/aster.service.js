import crypto from 'node:crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const { apiKey, secretKey, baseUrl } = config.aster;

function sign(queryString) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex');
}

function buildSignedParams(params) {
  params.timestamp = Date.now().toString();
  params.recvWindow = '5000';

  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  return `${qs}&signature=${sign(qs)}`;
}

async function request(method, path, params = {}, signed = true) {
  const qs = signed ? buildSignedParams(params) : new URLSearchParams(params).toString();
  const url = `${baseUrl}${path}${qs ? '?' + qs : ''}`;

  const headers = { 'X-MBX-APIKEY': apiKey };

  logger.debug(`ASTER ${method} ${path}`, { params });

  const res = await fetch(url, { method, headers });
  const body = await res.json();

  if (!res.ok) {
    const msg = body?.msg || JSON.stringify(body);
    logger.error(`ASTER API error ${res.status}`, { path, code: body?.code, msg });
    throw new Error(`ASTER ${res.status}: ${msg}`);
  }

  return body;
}

// ─── Public methods ──────────────────────────────────────────

export async function setLeverage(symbol, leverage) {
  return request('POST', '/fapi/v1/leverage', { symbol, leverage });
}

export async function getPositions(symbol) {
  const data = await request('GET', '/fapi/v2/positionRisk', symbol ? { symbol } : {});
  return Array.isArray(data)
    ? data.filter((p) => parseFloat(p.positionAmt) !== 0)
    : [];
}

export async function placeMarketOrder(symbol, side, quantity) {
  return request('POST', '/fapi/v1/order', {
    symbol,
    side,
    type: 'MARKET',
    quantity,
  });
}

export async function placeStopLoss(symbol, side, quantity, stopPrice) {
  return request('POST', '/fapi/v1/order', {
    symbol,
    side,
    type: 'STOP_MARKET',
    stopPrice,
    quantity,
    reduceOnly: 'true',
    workingType: 'CONTRACT_PRICE',
  });
}

export async function placeTakeProfit(symbol, side, quantity, stopPrice) {
  return request('POST', '/fapi/v1/order', {
    symbol,
    side,
    type: 'TAKE_PROFIT_MARKET',
    stopPrice,
    quantity,
    reduceOnly: 'true',
    workingType: 'CONTRACT_PRICE',
  });
}

export async function cancelAllOrders(symbol) {
  return request('DELETE', '/fapi/v1/allOpenOrders', { symbol });
}

export async function getOpenOrders(symbol) {
  return request('GET', '/fapi/v1/openOrders', symbol ? { symbol } : {});
}

export async function getExchangeInfo() {
  return request('GET', '/fapi/v1/exchangeInfo', {}, false);
}

export function isConfigured() {
  return !!(apiKey && secretKey);
}
