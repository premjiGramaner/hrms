"""
Conversation session service.

Maintains a small in-memory context per session_id so the chatbot can
handle follow-up references like:

    User: Show John Smith.
    Bot:  John Smith is a Software Engineer in Engineering.
    User: What is his email?       ← resolved from session context

Session state shape:
    {
        "last_employee_db_id": int | None,
        "last_employee_name":  str | None,
    }

Storage backends:
    - Redis  : if REDIS_URL is set in .env (recommended for production)
    - In-proc dict: fallback (lost on restart, fine for development)

The Redis dependency is entirely optional — the service auto-detects
whether redis-py is installed and falls back gracefully.
"""

import asyncio
import json
import logging
import uuid
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── In-process fallback store ────────────────────────────────────────────────
_memory_store: dict[str, dict] = {}
_store_lock = asyncio.Lock()

# ── Redis client (optional) ──────────────────────────────────────────────────
_redis_client = None
_redis_checked = False


def _get_redis():
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    try:
        from app.core.config import get_settings
        settings = get_settings()
        if not settings.redis_url:
            return None
        import redis.asyncio as aioredis  # type: ignore[import-untyped]
        _redis_client = aioredis.from_url(
            settings.redis_url, decode_responses=True
        )
        logger.info("Session store: Redis (%s)", settings.redis_url)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis unavailable, using in-memory session store: %s", exc)
        _redis_client = None
    return _redis_client


# ── TTL (seconds) ─────────────────────────────────────────────────────────────
def _ttl() -> int:
    from app.core.config import get_settings
    return get_settings().session_ttl_seconds


# ── Public API ────────────────────────────────────────────────────────────────

def new_session_id() -> str:
    return f"sess_{uuid.uuid4().hex[:16]}"


async def get_session(session_id: str) -> dict[str, Any]:
    """Return the session dict for *session_id*, or an empty dict."""
    redis = _get_redis()
    if redis:
        try:
            raw = await redis.get(f"hrms_chat:{session_id}")
            return json.loads(raw) if raw else {}
        except Exception as exc:  # noqa: BLE001
            logger.debug("Redis get failed: %s", exc)

    async with _store_lock:
        return dict(_memory_store.get(session_id, {}))


async def set_session(session_id: str, data: dict[str, Any]) -> None:
    """Persist *data* for *session_id*."""
    redis = _get_redis()
    if redis:
        try:
            await redis.setex(
                f"hrms_chat:{session_id}", _ttl(), json.dumps(data)
            )
            return
        except Exception as exc:  # noqa: BLE001
            logger.debug("Redis set failed: %s", exc)

    async with _store_lock:
        _memory_store[session_id] = data


async def update_session_employee(
    session_id: str,
    employee_db_id: Optional[int],
    employee_name: Optional[str],
) -> None:
    """Convenience helper — update the last-referenced employee in the session."""
    data = await get_session(session_id)
    data["last_employee_db_id"] = employee_db_id
    data["last_employee_name"] = employee_name
    await set_session(session_id, data)
