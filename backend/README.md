# Trading Bot — Backend

Backend service that fetches hourly BTC/USDT and ETH/USDT candle data from Binance's free public API and stores it in MongoDB.

## Prerequisites

- Node.js >= 18
- MongoDB running locally (or a remote URI)

## Setup

```bash
cd backend
cp .env.example .env   # Edit if needed
npm install
```

## Run

```bash
npm start       # Production
npm run dev     # Development (auto-restart on changes)
```

## What it does

1. **On startup** — backfills the last 30 days of 1h candles for BTCUSDT and ETHUSDT
2. **Every hour** — fetches the latest candles and upserts them (no duplicates)
3. **Sync logs** — every sync writes to the `sync_logs` collection with status, duration, and counts

## Configuration

All config via environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/trading-bot` | MongoDB connection string |
| `BINANCE_BASE_URL` | `https://data-api.binance.vision` | Binance public API |
| `SYNC_CRON` | `0 */1 * * *` | Cron expression for sync schedule |
| `BACKFILL_DAYS` | `30` | Days to backfill on first run |
| `LOG_LEVEL` | `info` | Winston log level |
