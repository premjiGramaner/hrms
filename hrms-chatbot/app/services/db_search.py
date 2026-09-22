"""
Direct PostgreSQL search for employees — including terminated/deleted.

Used as fallback when the Node.js chatbot-search endpoint is unavailable
or returns no results. Queries tbl_appusers directly.

DB URL is read from the HRMS_DB_URL environment variable (set in .env).
Falls back gracefully if the variable is missing or the connection fails.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Connection pool — created lazily on first use
_pool = None


def _db_url() -> Optional[str]:
    """
    Resolve the database connection URL.
    Priority:
      1. HRMS_DB_URL  (explicit full DSN)
      2. Reconstruct from individual DB_* vars that the Node.js server uses
    Returns None if neither is available.
    """
    url = os.environ.get("HRMS_DB_URL", "").strip()
    if url:
        # asyncpg requires postgresql://, not postgres://
        return url.replace("postgres://", "postgresql://", 1)

    # Fallback: compose from individual vars
    host     = os.environ.get("DB_HOST", "localhost")
    port     = os.environ.get("DB_PORT", "5432")
    name     = os.environ.get("DB_NAME", "")
    user     = os.environ.get("DB_USER", "")
    password = os.environ.get("DB_PASSWORD", "")

    if name and user:
        import urllib.parse
        encoded_pass = urllib.parse.quote(password, safe="")
        return f"postgresql://{user}:{encoded_pass}@{host}:{port}/{name}"

    return None


async def _get_pool():
    global _pool
    if _pool is not None:
        return _pool
    try:
        import asyncpg  # type: ignore[import-untyped]
        url = _db_url()
        if not url:
            logger.warning(
                "No DB URL configured — set HRMS_DB_URL in .env "
                "to enable direct DB fallback for terminated employees"
            )
            return None
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=5)
        logger.info("Direct DB connection pool created")
    except Exception as exc:
        logger.warning("Direct DB connection failed: %s", exc)
        _pool = None
    return _pool


async def search_all_employees_db(search: str, limit: int = 20) -> list[dict]:
    """
    Search ALL employees including terminated and deleted directly from DB.
    Returns list of employee dicts matching the Node.js API shape.
    """
    pool = await _get_pool()
    if not pool:
        return []

    try:
        term = f"%{search.strip()}%" if search.strip() else "%"
        rows = await pool.fetch(
            """
            SELECT
                id::int,
                employee_id,
                name,
                first_name,
                last_name,
                email,
                mobile,
                job_title,
                role,
                joined_date::text,
                is_active,
                employment_status,
                is_deleted,
                sub_unit,
                location,
                CASE
                    WHEN supervisors IS NULL OR TRIM(supervisors) = '' THEN '[]'
                    ELSE supervisors
                END AS supervisors
            FROM tbl_appusers
            WHERE (
                name          ILIKE $1
                OR first_name ILIKE $1
                OR last_name  ILIKE $1
                OR employee_id::text ILIKE $1
                OR email      ILIKE $1
                OR CONCAT_WS(' ', first_name, middle_name, last_name) ILIKE $1
            )
            ORDER BY
                CASE WHEN is_deleted THEN 1 ELSE 0 END,
                name ASC
            LIMIT $2
            """,
            term, limit,
        )
        return [dict(r) for r in rows]
    except Exception as exc:
        logger.error("DB search failed: %s", exc)
        return []
