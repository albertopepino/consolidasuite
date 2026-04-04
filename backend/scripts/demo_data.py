#!/usr/bin/env python3
"""
Demo data manager for ConsolidaSuite.

Usage:
    PYTHONPATH=. python scripts/demo_data.py load     # Load demo data
    PYTHONPATH=. python scripts/demo_data.py clear    # Remove all demo data
    PYTHONPATH=. python scripts/demo_data.py status   # Show current data counts
"""
from __future__ import annotations

import asyncio
import sys

from sqlalchemy import text

from app.database import async_session_factory


ALL_TABLES = [
    'financial_line_items', 'financial_statements', 'salary_records',
    'employees', 'positions', 'departments',
    'budget_entries', 'kpi_targets',
    'account_mappings', 'site_accounts', 'group_accounts',
    'ic_invoices', 'ic_loans',
    'assets',
    'tax_filings', 'tax_jurisdictions',
    'cash_positions', 'debt_instruments', 'bank_accounts',
    'statutory_audits', 'directors', 'legal_entities',
    'dashboard_configs', 'audit_logs', 'fx_rates',
    'user_site', 'users', 'sites',
]


async def status():
    async with async_session_factory() as s:
        print("\n  ConsolidaSuite - Database Status\n")
        total = 0
        for t in sorted(ALL_TABLES):
            try:
                r = await s.execute(text(f'SELECT count(*) FROM {t}'))
                c = r.scalar()
                total += c
                if c > 0:
                    print(f"    {t:30s} {c:>6,}")
            except Exception:
                pass
        print(f"\n    {'TOTAL':30s} {total:>6,}\n")


async def clear():
    async with async_session_factory() as s:
        print("\n  Clearing all data...")
        for t in ALL_TABLES:
            try:
                await s.execute(text(f'TRUNCATE TABLE {t} CASCADE'))
            except Exception:
                pass
        await s.commit()
        print("  All tables cleared.\n")


async def load():
    # First clear
    await clear()

    # Then run the full seed
    print("  Loading demo data...\n")

    # Import and run the seed function
    from scripts.seed_all import seed
    await seed()

    print("\n  Demo data loaded successfully.\n")
    await status()


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ('load', 'clear', 'status'):
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == 'status':
        asyncio.run(status())
    elif cmd == 'clear':
        asyncio.run(clear())
        print("  Database is now empty. Only schema remains.")
        print("  To reload: PYTHONPATH=. python scripts/demo_data.py load\n")
    elif cmd == 'load':
        asyncio.run(load())


if __name__ == '__main__':
    main()
