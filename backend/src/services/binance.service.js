import config from '../config/index.js';
import logger from '../utils/logger.js';

const KLINE_LIMIT = 1000;

/**
 * Maps raw Binance kline array to a structured object.
 * Binance kline format: [openTime, open, high, low, close, volume, closeTime,
 *   quoteAssetVolume, numberOfTrades, takerBuyBaseVol, takerBuyQuoteVol, ignore]
 */
function parseKline(symbol, interval, raw) {
  return {
    symbol,
    interval,
    openTime: new Date(raw[0]),
    open: parseFloat(raw[1]),
    high: parseFloat(raw[2]),
    low: parseFloat(raw[3]),
    close: parseFloat(raw[4]),
    volume: parseFloat(raw[5]),
    closeTime: new Date(raw[6]),
    quoteVolume: parseFloat(raw[7]),
    trades: raw[8],
  };
}

/**
 * Fetches klines from Binance public API. Handles pagination automatically
 * when requesting ranges larger than the 1000-candle limit.
 */
export async function fetchKlines(symbol, interval, startTime, endTime) {
  const allCandles = [];
  let cursor = startTime;

  while (cursor < endTime) {
    const url = new URL(`${config.binance.baseUrl}/api/v3/klines`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('startTime', cursor.toString());
    url.searchParams.set('endTime', endTime.toString());
    url.searchParams.set('limit', KLINE_LIMIT.toString());

    logger.debug('Fetching klines', {
      symbol,
      interval,
      startTime: new Date(cursor).toISOString(),
      limit: KLINE_LIMIT,
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Binance API ${response.status}: ${body}`);
    }

    const data = await response.json();

    if (!data.length) break;

    const candles = data.map((k) => parseKline(symbol, interval, k));
    allCandles.push(...candles);

    const lastOpenTime = data[data.length - 1][0];
    cursor = lastOpenTime + 1;

    if (data.length < KLINE_LIMIT) break;

    await sleep(200);
  }

  logger.info(`Fetched ${allCandles.length} candles`, { symbol, interval });
  return allCandles;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
