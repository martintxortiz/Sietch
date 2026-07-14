import unittest
from collections import namedtuple
from datetime import datetime, timezone

from workers.mt5_sync import deal_row, sync_start


class Mt5SyncTest(unittest.TestCase):
    def test_sync_start_overlaps_last_success_without_crossing_start_date(self) -> None:
        account = {
            "start_date": "2026-07-14",
            "last_synced_at": "2026-07-14T00:03:00Z",
        }
        self.assertEqual(
            sync_start(account),
            datetime(2026, 7, 14, tzinfo=timezone.utc),
        )

    def test_deal_row_preserves_mt5_ids_and_financial_values(self) -> None:
        fields = (
            "ticket order time time_msc type entry magic position_id reason volume "
            "price commission swap profit fee symbol comment external_id"
        )
        deal = namedtuple("Deal", fields)(
            42,
            41,
            1_752_451_200,
            1_752_451_200_123,
            1,
            1,
            7,
            40,
            0,
            0.5,
            1.2345,
            -2.5,
            -0.25,
            125.75,
            -0.5,
            "EURUSD",
            "close",
            "broker-42",
        )
        row = deal_row(
            {"account_id": "account", "user_id": "user"},
            deal,
        )

        self.assertEqual(row["provider_deal_id"], "42")
        self.assertEqual(row["provider_position_id"], "40")
        self.assertEqual(row["profit"], 125.75)
        self.assertEqual(row["commission"], -2.5)
        self.assertEqual(row["symbol"], "EURUSD")


if __name__ == "__main__":
    unittest.main()
