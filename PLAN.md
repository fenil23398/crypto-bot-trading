# Trading Bot — Project Plan

## Overview

Automated trading system that fetches BTC/USDT and ETH/USDT candle data from Binance,
stores it in MongoDB, computes technical indicators, and executes trades on ASTER Dex.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│ Binance API  │────▶│  Backend     │────▶│  MongoDB  │
│ (Public)     │     │  (Node.js)   │     │           │
└─────────────┘     └──────┬───────┘     └───────────┘
                           │
                    ┌──────▼───────┐
                    │  ASTER Dex   │  (Phase 3)
                    │  (Orders)    │
                    └──────────────┘
```

---

## Data Source

- **Binance Public API** — No authentication required
- Endpoint: `https://data-api.binance.vision/api/v3/klines`
- Pairs: `BTCUSDT`, `ETHUSDT`
- Interval: `1h`
- Free, reliable, high uptime

---

## Phase 1 — Data Ingestion (Current)

### Goal
Fetch hourly candle data for BTC/USDT and ETH/USDT, persist to MongoDB,
and maintain a sync log tracking when each collection was last updated.

### Deliverables
- [x] Node.js backend with clean service architecture
- [x] MongoDB models: `Candle`, `SyncLog`
- [x] Binance service: fetch klines from public API
- [x] Candle sync service: upsert candles, avoid duplicates
- [x] Cron job: runs every hour automatically
- [x] Initial backfill: fetch last 30 days on first run
- [x] Structured logging

### Tech Stack
| Component       | Choice              |
|-----------------|---------------------|
| Runtime         | Node.js (ESM)       |
| Database        | MongoDB + Mongoose  |
| HTTP Client     | Native fetch        |
| Scheduler       | node-cron           |
| Logging         | winston             |
| Config          | dotenv              |

### Database Schema

**candles**
```
{
  symbol:     String    (e.g. "BTCUSDT")
  interval:   String    (e.g. "1h")
  openTime:   Date
  closeTime:  Date
  open:       Number
  high:       Number
  low:        Number
  close:      Number
  volume:     Number
  trades:     Number
}
Unique index: { symbol, interval, openTime }
```

**sync_logs**
```
{
  symbol:       String
  interval:     String
  lastSyncAt:   Date
  candleCount:  Number
  status:       String  ("success" | "error")
  error:        String  (nullable)
}
```

---

## Phase 2 — SuperTrend Strategy Bot (Current)

### Goal
Compute SuperTrend indicator on stored candle data, detect direction changes,
and log BUY/SELL signals. Runs automatically after every data sync.

### How It Works
1. After each sync, the bot loads recent candles from MongoDB
2. Computes SuperTrend (ATR-based trailing stop with configurable period/multiplier)
3. Compares current direction vs previous direction
4. On direction flip: BEAR→BULL = **BUY**, BULL→BEAR = **SELL**
5. Stores signal in `signals` collection and logs the action
6. Duplicate signals for the same candle are prevented via unique index

### Configuration (via .env)
| Setting | Default | Description |
|---|---|---|
| `SUPERTREND_PERIOD` | `10` | ATR lookback period |
| `SUPERTREND_MULTIPLIER` | `3` | Band distance multiplier |

### Deliverables
- [x] SuperTrend indicator calculation (ATR from `technicalindicators` lib)
- [x] Signal model in MongoDB with unique index
- [x] Strategy bot service: evaluates all symbols, detects flips
- [x] Integrated into pipeline: sync → evaluate → log signals
- [x] Configurable period & multiplier via environment

### Database Schema — signals
```
{
  symbol:         String     (e.g. "BTCUSDT")
  interval:       String     (e.g. "1h")
  strategy:       String     ("supertrend")
  action:         String     ("BUY" | "SELL")
  price:          Number
  candleOpenTime:  Date
  indicators:     Mixed      { supertrend, direction, upperBand, lowerBand, period, multiplier }
  executed:        Boolean   (false — flipped to true when order placed in Phase 3)
}
Unique index: { symbol, strategy, candleOpenTime }
```

### Future Indicators (Phase 2b)
- **RSI** — Overbought/oversold filter
- **EMA crossover** — Trend confirmation

---

## Phase 3 — ASTER Dex Integration (Current)

### Goal
Execute leveraged MARKET orders on ASTER Dex when strategy bots generate signals,
with automated stop-loss and take-profit placement.

### How It Works
1. Bot generates BUY/SELL signal (e.g. SuperTrend flips direction)
2. Order manager sets leverage to 3x on ASTER
3. Closes any existing opposite position + cancels its SL/TP orders
4. Places MARKET entry order (BUY for long, SELL for short)
5. Places STOP_MARKET at 25% margin loss (~8.33% price move at 3x)
6. Places TAKE_PROFIT_MARKET at 25% margin gain (~8.33% price move at 3x)
7. Updates signal as `executed`, logs everything to `bot_logs` and `orders`

### Configuration (via .env)
| Setting | Default | Description |
|---|---|---|
| `ASTER_API_KEY` | — | API key from asterdex.com/en/api-management |
| `ASTER_SECRET_KEY` | — | Secret key (shown once at creation) |
| `ASTER_BASE_URL` | `https://fapi.asterdex.com` | ASTER futures API |
| `ASTER_LEVERAGE` | `3` | Position leverage |
| `ASTER_TRADE_USDT` | `100` | USDT margin per trade |
| `ASTER_SL_PERCENT` | `25` | Stop-loss as % of margin |
| `ASTER_TP_PERCENT` | `25` | Take-profit as % of margin |

### Deliverables
- [x] ASTER service: HMAC SHA256 signing, place/cancel orders, set leverage
- [x] Order manager: close-reverse-open-SL-TP orchestration
- [x] Order model in MongoDB (entry, SL, TP, status, linked to signal)
- [x] Bot manager integration: auto-executes on signal generation
- [x] Orders API routes: history, positions, detail
- [x] Graceful degradation: works without API keys (logs only)

### Database Schema — orders
```
{
  strategy:      String       ("supertrend" | "macd" | "rsi_ema" | "system")
  signalId:      ObjectId     (ref to Signal)
  symbol:        String       ("BTCUSDT")
  side:          String       ("BUY" | "SELL")
  type:          String       ("MARKET" | "STOP_MARKET" | "TAKE_PROFIT_MARKET")
  quantity:      Number
  price:         Number       (fill price)
  stopPrice:     Number       (for SL/TP orders)
  leverage:      Number       (3)
  status:        String       ("NEW" | "FILLED" | "CANCELED" | "FAILED")
  asterOrderId:  String       (ASTER's order ID)
  parentOrderId: ObjectId     (links SL/TP back to entry order)
  error:         String
}
```

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/orders` | All orders (?strategy=&symbol=&limit=) |
| GET | `/api/orders/positions` | Open positions from ASTER |
| GET | `/api/orders/:orderId` | Single order detail |

---

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── index.js                  # Environment config
│   │   └── database.js               # MongoDB connection
│   ├── models/
│   │   ├── candle.model.js           # Candle schema
│   │   ├── signal.model.js           # Strategy signal schema
│   │   ├── bot-log.model.js          # Bot transaction logs
│   │   ├── order.model.js            # ASTER order tracking
│   │   └── sync-log.model.js         # Sync log schema
│   ├── services/
│   │   ├── aster.service.js          # ASTER Dex API client
│   │   ├── binance.service.js        # Binance API client
│   │   ├── bot-manager.service.js    # Start/stop bots, evaluate strategies
│   │   ├── candle-sync.service.js    # Orchestrates fetch + store
│   │   ├── order-manager.service.js  # Order execution orchestrator
│   │   ├── indicators/
│   │   │   ├── supertrend.js         # SuperTrend calculation
│   │   │   ├── macd.js               # MACD crossover
│   │   │   └── rsi-ema.js            # RSI + EMA combo
│   │   └── strategies/
│   │       ├── registry.js           # Strategy plugin registry
│   │       ├── supertrend.strategy.js
│   │       ├── macd.strategy.js
│   │       └── rsi-ema.strategy.js
│   ├── routes/
│   │   ├── index.js                  # Route mounting
│   │   ├── bots.routes.js            # Bot management API
│   │   └── orders.routes.js          # Order history API
│   ├── jobs/
│   │   └── scheduler.js              # Cron: sync → evaluate → execute
│   ├── utils/
│   │   └── logger.js                 # Winston logger
│   └── index.js                      # Entry point + Express server
├── .env.example
├── package.json
└── README.md
```
