"""
Internal HTTP bridge: Node trading backend -> ostium-python-sdk (Arbitrum).
Run: uvicorn app:app --host 127.0.0.1 --port 5055
"""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Any, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field
from web3 import Web3

load_dotenv()

sdk: Any = None
_bridge_secret: str = ""
_slippage: float = 1.0
_pair_map: dict[str, str] = {}


def _load_pair_map() -> dict[str, str]:
    raw = os.getenv("OSTIUM_PAIR_MAP", "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return {str(k).upper(): str(v) for k, v in data.items()}
    except json.JSONDecodeError as e:
        raise RuntimeError(f"OSTIUM_PAIR_MAP must be valid JSON: {e}") from e


def _check_secret(x_secret: Optional[str]) -> None:
    if not _bridge_secret:
        return
    if x_secret != _bridge_secret:
        raise HTTPException(status_code=401, detail="Invalid bridge secret")


def _tx_hash_hex(receipt: Any) -> Optional[str]:
    if receipt is None:
        return None
    h = getattr(receipt, "transactionHash", None) or receipt.get("transactionHash")
    if h is None:
        return None
    if hasattr(h, "hex"):
        return h.hex()
    return Web3.to_hex(h)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global sdk, _bridge_secret, _slippage, _pair_map
    _bridge_secret = os.getenv("OSTIUM_BRIDGE_SECRET", "").strip()
    _slippage = float(os.getenv("OSTIUM_SLIPPAGE_PERCENT", "1") or "1")
    _pair_map = _load_pair_map()

    from ostium_python_sdk import OstiumSDK

    network = os.getenv("OSTIUM_NETWORK", "testnet").strip().lower()
    if network not in ("mainnet", "testnet"):
        raise RuntimeError("OSTIUM_NETWORK must be mainnet or testnet")

    pk = os.getenv("PRIVATE_KEY") or os.getenv("OSTIUM_PRIVATE_KEY")
    if not pk:
        raise RuntimeError("PRIVATE_KEY or OSTIUM_PRIVATE_KEY is required")

    rpc = os.getenv("RPC_URL") or os.getenv("OSTIUM_RPC_URL")
    if not rpc:
        raise RuntimeError("RPC_URL or OSTIUM_RPC_URL is required")

    sdk = OstiumSDK(network, private_key=pk, rpc_url=rpc, verbose=os.getenv("VERBOSE") == "1")
    yield
    sdk = None


app = FastAPI(title="Ostium bridge", lifespan=lifespan)


def _split_binance_symbol(symbol: str) -> tuple[str, str]:
    s = symbol.upper().strip()
    if s.endswith("USDT"):
        return s[:-4], "USDT"
    if s.endswith("USDC"):
        return s[:-4], "USDC"
    if s.endswith("BUSD"):
        return s[:-4], "BUSD"
    raise ValueError(f"Unsupported symbol format: {symbol}")


async def resolve_pair(symbol: str) -> tuple[int, str, str]:
    sym = symbol.upper().strip()
    if sym in _pair_map:
        pair_id = int(_pair_map[sym])
        details = await sdk.subgraph.get_pair_details(str(pair_id))
        return pair_id, details["from"], details["to"]

    base, quote = _split_binance_symbol(sym)
    pairs = await sdk.subgraph.get_pairs()
    candidates: list[tuple[int, str, str]] = []
    for p in pairs:
        pid = int(p["id"])
        pf = str(p["from"]).upper()
        pt = str(p["to"]).upper()
        if pf == base and pt == quote:
            return pid, p["from"], p["to"]
        if pf == base and quote == "USDT" and pt in ("USDC", "USD"):
            candidates.append((pid, p["from"], p["to"]))
    if len(candidates) == 1:
        return candidates[0]
    if candidates:
        raise HTTPException(
            status_code=400,
            detail=f"Ambiguous Ostium pair for {sym}; set OSTIUM_PAIR_MAP to a pair id",
        )
    raise HTTPException(
        status_code=404,
        detail=f"No Ostium pair for {sym}; add OSTIUM_PAIR_MAP or list pairs via SDK",
    )


def _trade_to_binance_position(t: dict, from_a: str, to_a: str) -> dict:
    """Approximate Binance positionRisk shape for the Node bot + UI."""
    try:
        from ostium_python_sdk.utils import get_trade_details

        open_price, trade_notional, _, lev, collateral, pair_index, index, is_long, sl_price, tp_price = (
            get_trade_details(t)
        )
    except Exception:
        open_price = float(t.get("openPrice", 0) or 0)
        is_long = bool(t.get("isBuy", True))
        trade_notional = 0.0
        lev = float(t.get("leverage", 0) or 0)
        collateral = 0.0
        pair_index = t.get("pair", {}).get("id", 0)
        index = t.get("index", 0)
        sl_price = 0.0
        tp_price = 0.0

    sym = f"{from_a}{to_a}".upper()
    qty = 0.0
    if open_price and trade_notional:
        qty = float(trade_notional) / float(open_price)
    if not is_long:
        qty = -abs(qty) if qty else -1.0
    else:
        qty = abs(qty) if qty else 1.0

    return {
        "symbol": sym,
        "positionAmt": str(qty),
        "entryPrice": str(open_price or 0),
        "markPrice": str(open_price or 0),
        "unRealizedProfit": "0",
        "liquidationPrice": "0",
        "leverage": str(int(lev) if lev else 0),
        "positionSide": "BOTH",
        "pairId": str(pair_index),
        "tradeIndex": str(index),
        "stopLossPrice": str(sl_price),
        "takeProfitPrice": str(tp_price),
        "collateral": str(collateral),
    }


@app.get("/health")
async def health():
    return {"ok": True, "network": os.getenv("OSTIUM_NETWORK", "testnet")}


@app.get("/positions")
async def positions(
    symbol: Optional[str] = Query(None),
    x_ostium_bridge_secret: Optional[str] = Header(None, alias="X-Ostium-Bridge-Secret"),
):
    _check_secret(x_ostium_bridge_secret)
    addr = sdk.ostium.get_public_address()
    open_trades = await sdk.subgraph.get_open_trades(addr)
    want_pid: Optional[int] = None
    if symbol:
        want_pid, _, _ = await resolve_pair(symbol)

    out: list[dict] = []
    for t in open_trades:
        pair = t.get("pair") or {}
        pid = int(pair.get("id", -1))
        if want_pid is not None and pid != want_pid:
            continue
        from_a = str(pair.get("from", ""))
        to_a = str(pair.get("to", ""))
        out.append(_trade_to_binance_position(t, from_a, to_a))
    return {"count": len(out), "positions": out}


class OpenMarketBody(BaseModel):
    symbol: str
    side: Literal["BUY", "SELL"]
    collateral: float = Field(gt=0)
    leverage: int = Field(ge=1)
    stop_loss: float = Field(..., description="Absolute price for SL")
    take_profit: float = Field(..., description="Absolute price for TP")
    slippage_percent: Optional[float] = None


@app.post("/v1/open-market")
async def open_market(
    body: OpenMarketBody,
    x_ostium_bridge_secret: Optional[str] = Header(None, alias="X-Ostium-Bridge-Secret"),
):
    _check_secret(x_ostium_bridge_secret)
    pair_id, from_a, to_a = await resolve_pair(body.symbol)
    latest_price, _ = await sdk.price.get_price(from_a, to_a)
    if latest_price is None:
        raise HTTPException(status_code=502, detail="Could not fetch mark price")

    slip = float(body.slippage_percent) if body.slippage_percent is not None else _slippage
    sdk.ostium.set_slippage_percentage(slip)

    trade_params: dict[str, Any] = {
        "collateral": body.collateral,
        "leverage": body.leverage,
        "asset_type": pair_id,
        "direction": body.side == "BUY",
        "order_type": "MARKET",
        "tp": body.take_profit,
        "sl": body.stop_loss,
    }

    def _open():
        return sdk.ostium.perform_trade(trade_params, at_price=float(latest_price))

    try:
        result = await asyncio.to_thread(_open)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    receipt = result.get("receipt") if isinstance(result, dict) else None
    order_id = result.get("order_id") if isinstance(result, dict) else None

    return {
        "orderId": str(order_id) if order_id is not None else None,
        "txHash": _tx_hash_hex(receipt),
        "avgPrice": float(latest_price),
        "pairId": pair_id,
    }


class CloseSymbolBody(BaseModel):
    symbol: str


@app.post("/v1/close-all-for-symbol")
async def close_all_for_symbol(
    body: CloseSymbolBody,
    x_ostium_bridge_secret: Optional[str] = Header(None, alias="X-Ostium-Bridge-Secret"),
):
    """Close every open trade on the resolved pair (normally one)."""
    _check_secret(x_ostium_bridge_secret)
    pair_id, from_a, to_a = await resolve_pair(body.symbol)
    addr = sdk.ostium.get_public_address()
    open_trades = await sdk.subgraph.get_open_trades(addr)
    closed: list[dict] = []

    for t in open_trades:
        if int(t.get("pair", {}).get("id", -1)) != int(pair_id):
            continue
        idx = int(t["index"])
        latest_price, _ = await sdk.price.get_price(from_a, to_a)
        if latest_price is None:
            raise HTTPException(status_code=502, detail="Could not fetch mark price for close")

        sdk.ostium.set_slippage_percentage(_slippage)

        def _close():
            return sdk.ostium.close_trade(int(pair_id), idx, float(latest_price))

        try:
            result = await asyncio.to_thread(_close)
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        rec = result.get("receipt") if isinstance(result, dict) else result
        closed.append({"tradeIndex": idx, "txHash": _tx_hash_hex(rec)})

    return {"closed": closed, "count": len(closed)}


