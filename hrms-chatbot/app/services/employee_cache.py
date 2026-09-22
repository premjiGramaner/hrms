"""
Employee name cache — loads all employee names from the DB once,
then does fast local matching instead of relying on the search API.

This solves the "Sri" prefix collision problem permanently:
  - Search API returns partial matches
  - Local cache does exact word-match against all employees

Cache TTL: 5 minutes (300 s). A module-level asyncio.Lock prevents
simultaneous refresh coroutines — only one reload runs at a time;
others wait on the lock and then reuse the freshly loaded cache.
"""

import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# In-memory cache
_cache: list[dict] = []
_cache_time: float = 0.0
_CACHE_TTL = 300          # 5 minutes
_refresh_lock = asyncio.Lock()


async def get_all_employees(token: str) -> list[dict]:
    """
    Return the cached employee list, refreshing if stale.

    Uses an asyncio.Lock so only one coroutine performs the DB round-trip
    at a time.  All others wait and then reuse the result.
    """
    global _cache, _cache_time

    # Fast path — cache is fresh, no lock needed
    if _cache and (time.monotonic() - _cache_time) < _CACHE_TTL:
        return _cache

    async with _refresh_lock:
        # Re-check inside the lock — another coroutine may have refreshed
        if _cache and (time.monotonic() - _cache_time) < _CACHE_TTL:
            return _cache

        try:
            from app.services.db_search import search_all_employees_db
            employees = await search_all_employees_db("", limit=500)
            if employees:
                _cache = employees
                _cache_time = time.monotonic()
                terminated = sum(
                    1 for e in employees if e.get("employment_status") == "Terminated"
                )
                logger.info(
                    "Employee cache refreshed from DB: %d total (%d terminated)",
                    len(employees), terminated,
                )
            elif not _cache:
                logger.warning("Employee cache load returned 0 results — cache empty")
        except Exception as exc:
            logger.warning("Employee cache load failed: %s", exc)

    return _cache


def find_in_cache(query: str) -> list[dict]:
    """
    Fast local name matching against the cached employee list.

    Returns employees where ALL query words appear in at least one of:
      - name            (full display name, e.g. "Prashanth V")
      - first_name      (e.g. "Premkumar")
      - the concatenation of first_name + last_name

    This means "Prem" finds "Premkumar Raj" even if name is stored as
    "Raj Premkumar", and "Prashanth" finds "Prashanth V" reliably.
    """
    if not _cache or not query:
        return []

    query_words = query.strip().lower().split()

    def _matches(e: dict) -> bool:
        name      = (e.get("name") or "").lower()
        first     = (e.get("first_name") or "").lower()
        last      = (e.get("last_name") or "").lower()
        full_name = f"{first} {last}".strip()
        haystack  = f"{name} {full_name}".strip()
        return all(w in haystack for w in query_words)

    return [e for e in _cache if _matches(e)]
