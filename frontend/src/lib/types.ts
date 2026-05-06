export type Strategy = "supertrend" | "macd" | "rsi_ema" | "ma9" | "rsi_levels";
export type Side = "BUY" | "SELL";
export type TradingPlatform = "aster" | "ostium";

/** Per-platform sizing defaults from backend .env (ASTER_* / OSTIUM_*) */
export interface PlatformTradeDefaults {
  leverage: number;
  tradeUsdt: number;
  slPercent: number;
  tpPercent: number;
}

/** ADX trend filter (live bots + backtest defaults) */
export interface AdxFilterPublic {
  enabled: boolean;
  period: number;
  threshold: number;
}

export interface BotRuntimeParams {
  tradingPlatform: TradingPlatform;
  leverage: number;
  tradeUsdt: number;
  slPercent: number;
  tpPercent: number;
  adxFilterEnabled: boolean;
  adxPeriod: number;
  adxThreshold: number;
  symbols: string[];
}

export interface BotStatus {
  name: string;
  displayName: string;
  description: string;
  active: boolean;
  requiredCandles: number;
  runtimeParams: BotRuntimeParams;
  startedAt?: string;
  evaluations?: number;
  signalsGenerated?: number;
}

export interface BotLog {
  _id: string;
  strategy: Strategy;
  symbol: string;
  action: Side;
  price: number;
  candleOpenTime: string;
  indicators: Record<string, unknown>;
  status: "signal_generated" | "order_placed" | "order_failed";
  message: string;
  createdAt: string;
}

export interface Signal {
  _id: string;
  strategy: Strategy;
  symbol: string;
  interval: string;
  action: Side;
  price: number;
  candleOpenTime: string;
  indicators: Record<string, unknown>;
  executed: boolean;
  createdAt: string;
}

export interface Order {
  _id: string;
  strategy: string;
  signalId: string | null;
  symbol: string;
  side: Side;
  type: string;
  quantity: number;
  price: number | null;
  stopPrice: number | null;
  leverage: number;
  status: string;
  asterOrderId: string | null;
  ostiumOrderId: string | null;
  parentOrderId: string | null;
  error: string | null;
  createdAt: string;
}

export type ExitReason = "stop_loss" | "take_profit" | "signal_flip" | "still_open";

export interface BacktestTrade {
  entryTime: string;
  exitTime: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  margin: number;
  pnl: number;
  fee: number;
  balanceAfter: number;
  exitReason: ExitReason;
  slPrice: number;
  tpPrice: number;
  stillOpen?: boolean;
}

export interface BacktestSummary {
  strategy: string;
  strategyDisplayName: string;
  symbol: string;
  startBalance: number;
  endBalance: number;
  totalReturn: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  maxDrawdown: number;
  slHits: number;
  tpHits: number;
  signalFlips: number;
  leverage: number;
  feePercent: number;
  slPercent: number;
  tpPercent: number;
  period: { from: string; to: string };
  totalCandles: number;
  strategyConfig: Record<string, number>;
  adxFilter: {
    enabled: boolean;
    period: number;
    threshold: number;
    signalsRaw: number;
    signalsFilteredOut: number;
    signalsUsed: number;
  };
  /** Present for SuperTrend backtests: recent ST/ADX tail + why the latest flip may be skipped */
  superTrendDiagnostics?: {
    tailBars: Array<{
      openTime: string;
      close: number;
      stDirection: "BULL" | "BEAR" | null;
      adx: number | null;
    }>;
    lastBlockedSignal: {
      signalIndex: number;
      action: Side;
      signalBarOpenTime: string;
      adxEvaluationIndex: number;
      adxAtEvaluation: number | null;
      adxThreshold: number;
      reason: string;
    } | null;
    note: string | null;
  };
}

export interface BacktestResult {
  summary: BacktestSummary;
  trades: BacktestTrade[];
}

export interface BacktestParams {
  strategy?: string;
  symbol?: string;
  startBalance?: number;
  leverage?: number;
  feePercent?: number;
  slPercent?: number;
  tpPercent?: number;
  adxFilterEnabled?: boolean;
  adxPeriod?: number;
  adxThreshold?: number;
}

export interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  positionSide: string;
  marginType: string;
  isolatedMargin: string;
  notional: string;
  updateTime: number;
}
