#!/usr/bin/env python3
"""
NeuroTwin — Snowflake Environment Verifier
==========================================
Run this after configuring your .env to confirm the backend can reach
Snowflake and that every Cortex function NeuroTwin depends on is working.

Usage:
    cd /home/colin/NeuroTwin/backend
    source .venv/bin/activate
    python verify_env.py
"""

import os
import sys
import json
from pathlib import Path

from dotenv import load_dotenv

# ── helpers ──────────────────────────────────────────────────────

PASS = "\033[92m✅"
FAIL = "\033[91m❌"
WARN = "\033[93m⚠️"
RESET = "\033[0m"
failures: list[str] = []


def ok(label: str, detail: str = ""):
    print(f"  {PASS} {label}{RESET}" + (f"  →  {detail}" if detail else ""))


def fail(label: str, detail: str = ""):
    failures.append(label)
    print(f"  {FAIL} {label}{RESET}" + (f"  →  {detail}" if detail else ""))


def warn(label: str, detail: str = ""):
    print(f"  {WARN} {label}{RESET}" + (f"  →  {detail}" if detail else ""))


# ── main ─────────────────────────────────────────────────────────

def main() -> int:
    # 1. Load .env -------------------------------------------------
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        fail(".env file", f"not found at {env_path}")
        return 1
    load_dotenv(env_path)
    ok(".env loaded", str(env_path))

    # 2. Check DEMO_MODE -------------------------------------------
    if os.getenv("DEMO_MODE", "1") == "1":
        warn("DEMO_MODE is 1", "set DEMO_MODE=0 in .env, then re-run")
        return 1

    ok("DEMO_MODE=0")

    # 3. Check required vars ---------------------------------------
    required = [
        "SNOWFLAKE_ACCOUNT",
        "SNOWFLAKE_USER",
        "SNOWFLAKE_PASSWORD",
    ]
    missing = [v for v in required if not os.getenv(v)]
    if missing:
        for v in missing:
            fail(f"Missing env var: {v}")
        return 1
    ok("Required env vars present")

    # 4. Snowflake connection --------------------------------------
    print("\n  Connecting to Snowflake …")
    try:
        import snowflake.connector

        conn = snowflake.connector.connect(
            account=os.environ["SNOWFLAKE_ACCOUNT"],
            user=os.environ["SNOWFLAKE_USER"],
            password=os.environ["SNOWFLAKE_PASSWORD"],
            database=os.environ.get("SNOWFLAKE_DATABASE", "NEUROTWIN_DB"),
            schema=os.environ.get("SNOWFLAKE_SCHEMA", "PUBLIC"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "NEUROTWIN_WH"),
            role=os.environ.get("SNOWFLAKE_ROLE", "NEUROTWIN_APP_ROLE"),
        )
        cur = conn.cursor()
    except Exception as e:
        fail("Snowflake connection", str(e))
        print(
            "\n  Hint: double-check SNOWFLAKE_ACCOUNT — it should look like\n"
            "  'xy12345.us-east-2.aws' (the part before .snowflakecomputing.com).\n"
            "  Find it in Snowsight bottom-left → click account → copy icon."
        )
        return 1

    cur.execute("SELECT CURRENT_VERSION()")
    version = cur.fetchone()[0]
    ok("Connected to Snowflake", f"v{version}")

    cur.execute("SELECT CURRENT_ACCOUNT(), CURRENT_ROLE(), CURRENT_WAREHOUSE(), CURRENT_DATABASE(), CURRENT_SCHEMA()")
    _, role, wh, db, schema = cur.fetchone()
    ok("Session context", f"role={role}  wh={wh}  db={db}.{schema}")

    # 5. Check tables exist ----------------------------------------
    print()
    expected_tables = {
        "STUDENTS",
        "JOURNAL_ENTRIES",
        "MOOD_CHECKINS",
        "TWIN_SNAPSHOTS",
        "MATCHES",
        "SAFETY_REPORTS",
    }
    cur.execute("SHOW TABLES IN SCHEMA")
    rows = cur.fetchall()
    found = {r[1].upper() for r in rows}  # column 1 = table name

    if expected_tables <= found:
        ok("All 6 NeuroTwin tables exist")
    else:
        missing_tables = expected_tables - found
        fail("Missing tables", ", ".join(sorted(missing_tables)))
        print(
            "\n  Run the setup.sql script first:\n"
            "  Open backend/setup.sql in Snowsight → Run All\n"
        )

    # 6. Cortex: SENTIMENT -----------------------------------------
    print()
    try:
        cur.execute(
            "SELECT SNOWFLAKE.CORTEX.SENTIMENT('I feel optimistic today')"
        )
        score = cur.fetchone()[0]
        ok("Cortex SENTIMENT", f"score={score}")
    except Exception as e:
        fail("Cortex SENTIMENT", str(e))

    # 7. Cortex: EMBED_TEXT_768 ------------------------------------
    try:
        cur.execute(
            "SELECT SNOWFLAKE.CORTEX.EMBED_TEXT_768("
            "'snowflake-arctic-embed-m-v1.5', 'hello world')"
        )
        emb_raw = cur.fetchone()[0]
        vec = json.loads(emb_raw) if isinstance(emb_raw, str) else emb_raw
        ok("Cortex EMBED_TEXT_768", f"vector length={len(vec)}")
    except Exception as e:
        fail("Cortex EMBED_TEXT_768", str(e))

    # 8. Cortex: COMPLETE (mistral-large2) -------------------------
    try:
        cur.execute(
            "SELECT SNOWFLAKE.CORTEX.COMPLETE("
            "'mistral-large2', 'Say hello in one word')"
        )
        reply = cur.fetchone()[0]
        ok("Cortex COMPLETE (mistral-large2)", f'reply="{reply[:60]}"')
    except Exception as e:
        fail("Cortex COMPLETE", str(e))

    # 9. Cortex: SUMMARIZE -----------------------------------------
    try:
        cur.execute(
            "SELECT SNOWFLAKE.CORTEX.SUMMARIZE("
            "'Snowflake is a cloud data platform. It offers data warehousing, "
            "data lakes, data engineering, and data sharing.')"
        )
        summary = cur.fetchone()[0]
        ok("Cortex SUMMARIZE", f'"{summary[:80]}…"')
    except Exception as e:
        fail("Cortex SUMMARIZE", str(e))

    # ── wrap up ───────────────────────────────────────────────────
    conn.close()
    print()
    if failures:
        print(f"  {FAIL} {len(failures)} check(s) failed.{RESET}  Fix the above, then re-run.\n")
        return 1
    else:
        print(f"  🎉  All checks passed! NeuroTwin backend is fully wired to Snowflake.{RESET}")
        print("     Start the server:  uvicorn main:app --reload\n")
        return 0


if __name__ == "__main__":
    sys.exit(main())
