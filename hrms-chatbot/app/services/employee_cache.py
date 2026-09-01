"""
Employee name cache — loads all employee names from Node.js once,
then does fast local matching instead of relying on the search API.

This solves the "Sri" prefix collision problem permanently:
- Search API returns partial matches
- Local cache does exact substring matching against all employees

Cache refreshes every 5 minutes automatically.
"""

import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# In-memory cache
_cache: list[dict] = []          # list of {id, name, employee_id, email, role}
_cache_time: float = 0.0
_CACHE_TTL = 60  # 1 minute — refresh more frequently so terminated employees appear quickly
_loading = False


async def get_all_employees(token: str) -> list[dict]:
    """Return cached employee list, refreshing if stale."""
    global _cache, _cache_time, _loading

    if _loading:
        # Another coroutine is loading — wait briefly and return stale cache
        await asyncio.sleep(0.1)
        return _cache

    if _cache and (time.monotonic() - _cache_time) < _CACHE_TTL:
        return _cache

    _loading = True
    try:
        from app.services.db_search import search_all_employees_db
        # Direct DB — includes terminated/deleted, no Node.js dependency
        employees = await search_all_employees_db("", limit=500)
        if employees:
            _cache = employees
            _cache_time = time.monotonic()
            terminated = sum(1 for e in employees if e.get("employment_status") == "Terminated")
            logger.info("Employee cache loaded from DB: %d total (%d terminated)", len(employees), terminated)
    except Exception as exc:
        logger.warning("Employee cache load failed: %s", exc)
    finally:
        _loading = False

    return _cache


def find_in_cache(query: str) -> list[dict]:
    """
    Fast local name matching against cached employee list.
    Returns employees where ALL query words are present in their name.
    """
    if not _cache or not query:
        return []

    query_words = query.strip().lower().split()

    matches = [
        e for e in _cache
        if all(w in (e.get("name") or "").lower() for w in query_words)
    ]
    return matches
