"""
Debug routes — only active when DEBUG=true in .env
Helps verify connectivity to the Node.js HRMS API.
Remove or disable in production.
"""

import logging
from fastapi import APIRouter, Depends
from app.core.security import CurrentUser, get_current_user
from app.core.config import get_settings
from app.services import hrms_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/debug", tags=["Debug"])


@router.get("/me", summary="Test: fetch my info from Node.js API")
async def debug_me(current_user: CurrentUser = Depends(get_current_user)):
    data = await hrms_client.get_my_info(current_user.raw_token)
    return {"user_id": current_user.user_id, "role": current_user.role, "data": data}


@router.get("/extract", summary="Test: entity extraction live")
async def debug_extract(text: str = "show Srirama Chandramurthy Mullapudi profile"):
    """Test entity extraction without auth — verify what the extractor sees."""
    from app.nlp.entity_extractor import get_entity_extractor, _KEYWORD_RE, _STOP
    ext = get_entity_extractor()
    result = ext.extract(text)

    kw_matches = []
    for m in _KEYWORD_RE.finditer(text):
        raw = m.group(1)
        cleaned = ext._clean(raw)
        kw_matches.append({"raw": raw, "cleaned": cleaned, "valid": ext._valid(cleaned)})

    return {
        "input": text,
        "employee_name": result.employee_name,
        "employee_id": result.employee_id,
        "email": result.email,
        "keyword_matches": kw_matches,
    }


@router.post("/cache/reset", summary="Test: force employee cache reset")
async def debug_cache_reset(current_user: CurrentUser = Depends(get_current_user)):
    """Force the employee cache to reload on next request."""
    from app.services import employee_cache
    employee_cache._cache = []
    employee_cache._cache_time = 0.0
    # Immediately reload
    await employee_cache.get_all_employees(current_user.raw_token)
    return {
        "message": "Cache reset and reloaded",
        "employee_count": len(employee_cache._cache),
        "sample": [e.get("name") for e in employee_cache._cache[:5]],
    }


@router.get("/leave-balance", summary="Test: fetch my leave balance from Node.js API")
async def debug_leave(current_user: CurrentUser = Depends(get_current_user)):
    data = await hrms_client.get_my_leave_balance(current_user.raw_token)
    return {
        "user_id": current_user.user_id,
        "hrms_url": get_settings().hrms_api_base_url,
        "endpoint": "/api/leaves/balance",
        "data": data,
        "count": len(data) if isinstance(data, list) else None,
    }


@router.get("/search", summary="Test: search employees")
async def debug_search(
    q: str = "a",
    current_user: CurrentUser = Depends(get_current_user),
):
    """Shows which endpoint was used and whether terminated employees appear."""
    data = await hrms_client.search_employees(current_user.raw_token, q, limit=10)
    return {
        "query": q,
        "count": len(data),
        "has_terminated": any(e.get("employment_status") == "Terminated" for e in data),
        "results": [
            {
                "name": e.get("name"),
                "employee_id": e.get("employee_id"),
                "status": e.get("employment_status"),
                "is_deleted": e.get("is_deleted"),
            }
            for e in data
        ],
    }


@router.get("/cache-status", summary="Test: show employee cache contents")
async def debug_cache_status(current_user: CurrentUser = Depends(get_current_user)):
    from app.services import employee_cache
    terminated = [e for e in employee_cache._cache if e.get("employment_status") == "Terminated"]
    return {
        "total_cached": len(employee_cache._cache),
        "terminated_count": len(terminated),
        "terminated_sample": [e.get("name") for e in terminated[:10]],
        "cache_age_seconds": int(__import__('time').monotonic() - employee_cache._cache_time),
    }
