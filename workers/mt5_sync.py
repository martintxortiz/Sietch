"""Sync MetaTrader 5 account details and raw deals into Supabase."""

from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen


class Supabase:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def request(
        self,
        method: str,
        path: str,
        payload: Any,
        prefer: str | None = None,
    ) -> Any:
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer
        body = json.dumps(payload, separators=(",", ":")).encode()
        request = Request(f"{self.url}{path}", body, headers, method=method)

        try:
            with urlopen(request, timeout=30) as response:
                content = response.read()
        except HTTPError as error:
            message = error.read().decode(errors="replace")
            raise RuntimeError(f"Supabase returned {error.code}: {message}") from error

        return json.loads(content) if content else None

    def accounts(self) -> list[dict[str, Any]]:
        return self.request("POST", "/rest/v1/rpc/worker_broker_accounts", {})

    def update_account(self, account_id: str, values: dict[str, Any]) -> None:
        self.request(
            "PATCH",
            f"/rest/v1/broker_accounts?id=eq.{account_id}",
            values,
            "return=minimal",
        )

    def upsert_deals(self, deals: list[dict[str, Any]]) -> None:
        if deals:
            self.request(
                "POST",
                "/rest/v1/broker_deals?on_conflict=account_id,provider_deal_id",
                deals,
                "resolution=merge-duplicates,return=minimal",
            )


def sync_start(account: dict[str, Any]) -> datetime:
    start = datetime.fromisoformat(account["start_date"]).replace(tzinfo=timezone.utc)
    last_synced = account.get("last_synced_at")
    if not last_synced:
        return start

    previous = datetime.fromisoformat(last_synced.replace("Z", "+00:00"))
    return max(start, previous - timedelta(minutes=5))


def deal_row(account: dict[str, Any], deal: Any) -> dict[str, Any]:
    raw = deal._asdict()
    time_msc = int(raw.get("time_msc") or int(raw["time"]) * 1000)

    return {
        "account_id": account["account_id"],
        "user_id": account["user_id"],
        "provider_deal_id": str(raw["ticket"]),
        "provider_order_id": str(raw["order"]) if raw.get("order") else None,
        "provider_position_id": (
            str(raw["position_id"]) if raw.get("position_id") else None
        ),
        "executed_at": datetime.fromtimestamp(
            time_msc / 1000, tz=timezone.utc
        ).isoformat(),
        "time_msc": time_msc,
        "type": int(raw["type"]),
        "entry": int(raw["entry"]),
        "reason": int(raw["reason"]),
        "symbol": str(raw.get("symbol") or ""),
        "volume": float(raw.get("volume") or 0),
        "price": float(raw.get("price") or 0),
        "commission": float(raw.get("commission") or 0),
        "swap": float(raw.get("swap") or 0),
        "profit": float(raw.get("profit") or 0),
        "fee": float(raw.get("fee") or 0),
        "magic": int(raw.get("magic") or 0),
        "comment": str(raw.get("comment") or ""),
        "external_id": str(raw.get("external_id") or ""),
        "raw": raw,
    }


def sync_account(db: Supabase, mt5: Any, account: dict[str, Any]) -> None:
    if not mt5.login(
        int(account["login"]),
        password=account["investor_password"],
        server=account["server"],
    ):
        raise RuntimeError(f"MT5 login failed: {mt5.last_error()}")

    info = mt5.account_info()
    if info is None:
        raise RuntimeError(f"MT5 account info failed: {mt5.last_error()}")

    synced_at = datetime.now(timezone.utc)
    deals = mt5.history_deals_get(sync_start(account), synced_at)
    if deals is None:
        raise RuntimeError(f"MT5 deal history failed: {mt5.last_error()}")

    db.upsert_deals([deal_row(account, deal) for deal in deals])
    db.update_account(
        account["account_id"],
        {
            "account_name": info.name or None,
            "balance": info.balance,
            "currency": info.currency or None,
            "equity": info.equity,
            "last_synced_at": synced_at.isoformat(),
            "status": "connected",
            "sync_error": None,
        },
    )


def sync_once(db: Supabase, mt5: Any, terminal_path: str | None) -> None:
    accounts = db.accounts()
    if not accounts:
        return

    initialized = mt5.initialize(terminal_path) if terminal_path else mt5.initialize()
    if not initialized:
        error = f"MT5 terminal initialization failed: {mt5.last_error()}"
        for account in accounts:
            db.update_account(
                account["account_id"],
                {"status": "error", "sync_error": error[:500]},
            )
        return

    try:
        for account in accounts:
            try:
                sync_account(db, mt5, account)
                print(f"Synced MT5 account {account['login']}")
            except Exception as error:
                db.update_account(
                    account["account_id"],
                    {"status": "error", "sync_error": str(error)[:500]},
                )
                print(f"Failed MT5 account {account['login']}: {error}")
    finally:
        mt5.shutdown()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()

    url = os.environ.get("BACKVIEW_SUPABASE_URL")
    key = os.environ.get("BACKVIEW_SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "BACKVIEW_SUPABASE_URL and BACKVIEW_SUPABASE_SERVICE_ROLE_KEY are required"
        )

    import MetaTrader5 as mt5

    db = Supabase(url, key)
    terminal_path = os.environ.get("BACKVIEW_MT5_TERMINAL") or None
    interval = max(5, int(os.environ.get("BACKVIEW_SYNC_INTERVAL_SECONDS", "30")))

    while True:
        sync_once(db, mt5, terminal_path)
        if args.once:
            break
        time.sleep(interval)


if __name__ == "__main__":
    main()
