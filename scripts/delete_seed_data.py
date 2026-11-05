#!/usr/bin/env python3
"""
One-command script to remove seeded demo records from events.db.
Always makes a backup copy of events.db before modifying.
"""

from datetime import datetime
import os
import shutil
import sqlite3
import sys

SEED_SOURCE_IDS = (
    'gh-pr-104-otp-verified',
    'sec-audit-otp-mod',
    'prd-auth-v1-otp',
    'gh-pr-112-rename-checkout',
    'jira-bank-201-payment-approved',
    'gh-commit-gateway-router',
    'gh-commit-reconciliation-worker',
    'jira-bank-205-passkey-proposed',
)


def main():
    db_path = os.getenv("EVENTS_DB_PATH", "events.db")
    if not os.path.exists(db_path):
        print(f"[!] Database file '{db_path}' not found. Nothing to clean.")
        return 0

    # 1. Create timestamped backup copy
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.bak-{timestamp}"
    shutil.copy2(db_path, backup_path)
    print(f"[*] Backup created: {backup_path}")

    # 2. Delete seed rows
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()

        # Count before
        cur.execute("SELECT count(*) FROM events")
        total_before = cur.fetchone()[0]

        # Delete linked reason notes
        placeholders = ",".join("?" for _ in SEED_SOURCE_IDS)
        cur.execute(
            f"DELETE FROM events WHERE related_source_id IN ({placeholders})",
            SEED_SOURCE_IDS,
        )

        # Delete seed events
        cur.execute(
            f"DELETE FROM events WHERE source_id IN ({placeholders}) OR details LIKE '%\"seed\":true%'",
            SEED_SOURCE_IDS,
        )
        deleted_count = cur.rowcount

        conn.commit()
        conn.execute("VACUUM")

        # Count after
        cur.execute("SELECT count(*) FROM events")
        remaining = cur.fetchone()[0]

        print(f"[+] Successfully deleted {deleted_count} seeded demo record(s).")
        print(f"[+] Remaining live events in events.db: {remaining}")
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())

