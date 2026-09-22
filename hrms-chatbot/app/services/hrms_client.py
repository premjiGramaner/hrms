"""
HRMS API client — all employee data comes from the existing Node.js server.

Route map (from server/src/index.js):
    /api/auth/*
    /api/employees/*
    /api/leaves/*          ← leave requests + balance
    /api/leave/entitlements/*   ← entitlements (my, list, create)
    /api/roles/*
    /api/hradmin/*
    /api/reports/*
    /api/performance/*

All paths below are relative to HRMS_API_BASE_URL (http://localhost:5001).
"""

import logging
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _client(token: str) -> httpx.AsyncClient:
    settings = get_settings()
    return httpx.AsyncClient(
        base_url=settings.hrms_api_base_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=settings.hrms_api_timeout,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Employee
# ─────────────────────────────────────────────────────────────────────────────

async def search_employees(token: str, search: str, limit: int = 20) -> list[dict]:
    """
    Search employees by name / employee_id / email.
    Uses /api/employees/chatbot-search (includes terminated employees),
    falls back to direct DB search if the API endpoint fails.
    """
    async with _client(token) as c:
        params = {"search": search, "limit": limit}
        results: list[dict] = []
        seen_ids: set[int] = set()

        # Primary: chatbot-search endpoint (includes terminated + all roles)
        # Response: { success: true, data: [ {...}, ... ] }  ← flat array
        try:
            r = await c.get("/api/employees/chatbot-search", params=params)
            r.raise_for_status()
            raw = r.json().get("data", [])
            # Handle both flat array and nested { data: [...] }
            if isinstance(raw, dict):
                raw = raw.get("data", [])
            for emp in (raw or []):
                if not isinstance(emp, dict):
                    continue
                eid = emp.get("id")
                if eid and eid not in seen_ids:
                    seen_ids.add(eid)
                    results.append(emp)
            logger.debug("chatbot-search %r → %d results (incl. terminated)", search, len(results))
            return results
        except Exception as exc:
            logger.warning("chatbot-search failed, falling back to DB: %s", exc)

        # Fallback: direct DB search (includes terminated/deleted, no Node.js needed)
        from app.services.db_search import search_all_employees_db
        db_results = await search_all_employees_db(search, limit)
        for emp in db_results:
            eid = emp.get("id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                results.append(emp)
        logger.debug("db_search fallback %r → %d results", search, len(results))
        return results


async def get_employee_by_id(token: str, db_id: int) -> Optional[dict]:
    """Fetch a single employee by DB integer ID."""
    async with _client(token) as c:
        try:
            r = await c.get(f"/api/employees/{db_id}")
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json().get("data")
        except httpx.HTTPStatusError as exc:
            logger.warning("get_employee_by_id %d HTTP %d", db_id, exc.response.status_code)
            return None
        except httpx.RequestError as exc:
            logger.error("get_employee_by_id network error: %s", exc)
            return None


async def get_my_info(token: str) -> Optional[dict]:
    """Fetch the profile of the currently authenticated user."""
    async with _client(token) as c:
        try:
            r = await c.get("/api/employees/my-info")
            r.raise_for_status()
            return r.json().get("data")
        except httpx.HTTPStatusError as exc:
            logger.warning("get_my_info HTTP %d", exc.response.status_code)
            return None
        except httpx.RequestError as exc:
            logger.error("get_my_info network error: %s", exc)
            return None


# ─────────────────────────────────────────────────────────────────────────────
# Leave balance  —  GET /api/leaves/balance
#
# Controller: getLeaveBalance
#   - No params  → uses req.user.id  (own balance)
#   - ?employee_id=X  → that employee's balance
#   - ?year=YYYY  → optional year filter
# Response: { success: true, data: [ { leave_type_name, total_days, used_days, ... } ] }
# ─────────────────────────────────────────────────────────────────────────────

async def get_my_leave_balance(token: str) -> Optional[list]:
    """Fetch leave balance for the currently authenticated user."""
    settings = get_settings()
    url = f"{settings.hrms_api_base_url}/api/leaves/balance"
    async with _client(token) as c:
        try:
            # Try current year first, fall back to next year if empty
            r = await c.get("/api/leaves/balance")
            r.raise_for_status()
            data = r.json().get("data", [])
            logger.debug("get_my_leave_balance status=%d count=%d", r.status_code, len(data) if data else 0)

            if not data:
                # Try next year (entitlements sometimes created for the coming fiscal year)
                next_year = __import__('datetime').datetime.now().year + 1
                r2 = await c.get("/api/leaves/balance", params={"year": next_year})
                r2.raise_for_status()
                data = r2.json().get("data", [])
                logger.debug("get_my_leave_balance year=%d count=%d", next_year, len(data) if data else 0)

            return data if isinstance(data, list) else []
        except httpx.HTTPStatusError as exc:
            logger.warning("get_my_leave_balance HTTP %d  url=%s  body=%s",
                exc.response.status_code, url, exc.response.text[:500])
            return None
        except httpx.RequestError as exc:
            logger.error("get_my_leave_balance network error  url=%s  err=%s", url, exc)
            return None


async def get_employee_leave_balance(token: str, employee_db_id: int) -> Optional[list]:
    """Fetch leave balance for a specific employee (admin/manager only)."""
    settings = get_settings()
    url = f"{settings.hrms_api_base_url}/api/leaves/balance?employee_id={employee_db_id}"
    async with _client(token) as c:
        try:
            r = await c.get("/api/leaves/balance", params={"employee_id": employee_db_id})
            r.raise_for_status()
            data = r.json().get("data", [])
            logger.debug("get_employee_leave_balance id=%d status=%d count=%d",
                employee_db_id, r.status_code, len(data) if data else 0)

            if not data:
                next_year = __import__('datetime').datetime.now().year + 1
                r2 = await c.get("/api/leaves/balance",
                    params={"employee_id": employee_db_id, "year": next_year})
                r2.raise_for_status()
                data = r2.json().get("data", [])
                logger.debug("get_employee_leave_balance id=%d year=%d count=%d",
                    employee_db_id, next_year, len(data) if data else 0)

            return data if isinstance(data, list) else []
        except httpx.HTTPStatusError as exc:
            logger.warning("get_employee_leave_balance id=%d HTTP %d  body=%s",
                employee_db_id, exc.response.status_code, exc.response.text[:500])
            return None
        except httpx.RequestError as exc:
            logger.error("get_employee_leave_balance network error  url=%s  err=%s", url, exc)
            return None


# ─────────────────────────────────────────────────────────────────────────────
# Employee resolver
# ─────────────────────────────────────────────────────────────────────────────

async def resolve_employee(
    token: str,
    *,
    employee_id: Optional[str] = None,
    email: Optional[str] = None,
    name: Optional[str] = None,
) -> dict:
    from app.services.employee_cache import find_in_cache, get_all_employees

    search_term = employee_id or email or name
    if not search_term:
        return {"status": "not_found"}

    clean = search_term.strip().lower()
    query_words = clean.split()

    # ── Name lookup ───────────────────────────────────────────────────────────
    # Strategy:
    #   1. Try the in-process employee cache (includes terminated employees).
    #      Matching requires ALL extracted words to appear in the name.
    #   2. If the cache is empty (DB unreachable) OR returns no matches,
    #      fall back to the Node.js chatbot-search API using the first word
    #      of the name as the search term — this handles partial names like
    #      "Prem" matching "Premkumar" and avoids dead-ends when the DB is down.
    if name and not employee_id and not email:
        from app.services import employee_cache as _ec
        await get_all_employees(token)
        cache_populated = bool(_ec._cache)

        matches = find_in_cache(name) if cache_populated else []

        if matches:
            if len(matches) == 1:
                logger.debug("cache resolved: %r → %s", name, matches[0].get("name"))
                return {"status": "found", "employee": matches[0]}

            # Multiple cache matches — try exact full name first
            exact = [e for e in matches if (e.get("name") or "").lower() == clean]
            if len(exact) == 1:
                return {"status": "found", "employee": exact[0]}

            return {
                "status": "ambiguous",
                "candidates": [e.get("name", "Unknown") for e in matches[:5]],
            }

        # Cache miss (empty cache or no matches) — fall back to search API.
        # Use the first word so "Prem" finds "Premkumar", "Prashanth" finds
        # "Prashanth V", etc.
        first_word = query_words[0] if query_words else clean
        logger.debug(
            "cache miss for %r (cache_populated=%s) — trying search API with %r",
            name, cache_populated, first_word,
        )
        api_results = await search_employees(token, first_word, limit=20)
        if not api_results:
            return {"status": "not_found"}

        # Filter to results whose name contains all extracted words
        filtered = [
            e for e in api_results
            if all(w in (e.get("name") or "").lower() for w in query_words)
        ]
        pool = filtered if filtered else api_results

        if len(pool) == 1:
            return {"status": "found", "employee": pool[0]}

        # Exact full-name match among the pool
        exact = [e for e in pool if (e.get("name") or "").lower() == clean]
        if len(exact) == 1:
            return {"status": "found", "employee": exact[0]}

        return {
            "status": "ambiguous",
            "candidates": [e.get("name", "Unknown") for e in pool[:5]],
        }

    # ── employee_id / email lookup: use search API ────────────────────────────
    results = await search_employees(token, search_term, limit=20)
    if not results:
        return {"status": "not_found"}

    exact = [
        e for e in results
        if (e.get("employee_id") or "").lower() == clean
        or (e.get("email") or "").lower() == clean
    ]
    if len(exact) == 1:
        return {"status": "found", "employee": exact[0]}
    if len(exact) > 1:
        return {"status": "ambiguous", "candidates": [e.get("name") for e in exact[:5]]}
    if len(results) == 1:
        return {"status": "found", "employee": results[0]}

    return {"status": "ambiguous", "candidates": [e.get("name") for e in results[:5]]}
