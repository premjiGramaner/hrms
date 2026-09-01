"""
Chatbot orchestration service.

Flow for every message:
    1.  Classify intent       — keyword rules first, then Hugging Face NLP
    2.  Extract entities      — Hugging Face NER + regex
    3.  Restore session ctx   — fills missing entities from prior turn
    4.  Route intent          — dispatch to self-service or employee handler
    5.  Call Node.js API      — forward user's own Bearer token
    6.  Build response        — deterministic template (no AI generation)
    7.  Update session ctx
"""

import logging
import json
from datetime import datetime
from typing import Any, Optional

from app.core.security import CurrentUser
from app.nlp.model_config import Intent
from app.schemas.chatbot import ChatResponse, EntityResult, IntentResult
from app.services import entity_service, intent_service, session_service
from app.services import hrms_client

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

async def handle_message(
    message: str,
    session_id: str,
    current_user: CurrentUser,
) -> ChatResponse:
    # 1. Intent classification (keyword rules → transformer)
    intent_result: IntentResult = await intent_service.classify_intent(message)

    # 2. Entity extraction
    entities: EntityResult = await entity_service.extract_entities(message)

    # 3. Session context
    session_data = await session_service.get_session(session_id)

    # 4–7. Route and build response
    answer, last_employee = await _route(
        intent=intent_result.intent,
        entities=entities,
        current_user=current_user,
        session_data=session_data,
        raw_message=message,
    )

    # Update session with resolved employee
    if last_employee:
        await session_service.update_session_employee(
            session_id,
            employee_db_id=last_employee.get("id"),
            employee_name=last_employee.get("name"),
        )

    return ChatResponse(
        intent=intent_result.intent,
        confidence=intent_result.confidence,
        entities=entities.model_dump(exclude_none=True),
        answer=answer,
        session_id=session_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Intent router
# ─────────────────────────────────────────────────────────────────────────────

async def _route(
    intent: str,
    entities: EntityResult,
    current_user: CurrentUser,
    session_data: dict,
    raw_message: str,
) -> tuple[str, Optional[dict]]:

    token = current_user.raw_token

    # ── UNKNOWN ───────────────────────────────────────────────────────────────
    if intent == Intent.UNKNOWN:
        return (
            "Sorry, I don't understand that HR request. "
            "Try asking about an employee's email, department, profile, leave balance, or manager.",
            None,
        )

    # ── MY_LEAVE_BALANCE ──────────────────────────────────────────────────────
    # If entities contain a name/id it means the user asked about someone else
    # e.g. "How many leaves does Sakthi have?" → keyword matched MY but entity=Sakthi
    if intent == Intent.MY_LEAVE_BALANCE:
        has_target = bool(entities.employee_id or entities.email or entities.employee_name)
        if not has_target:
            balance = await hrms_client.get_my_leave_balance(token)
            return _format_leave_balance(balance, owner="You", possessive="Your"), None
        # Fall through — treat as EMPLOYEE_LEAVE_BALANCE
        intent = Intent.EMPLOYEE_LEAVE_BALANCE

    # ── Other self-service intents ─────────────────────────────────────────────
    if intent in (
        Intent.MY_PROFILE, Intent.MY_EMAIL, Intent.MY_PHONE,
        Intent.MY_DEPARTMENT, Intent.MY_DESIGNATION, Intent.MY_MANAGER,
        Intent.MY_JOINING_DATE, Intent.MY_STATUS, Intent.MY_LOCATION,
    ):
        me = await hrms_client.get_my_info(token)
        if not me:
            return "I couldn't load your profile. Please make sure you're logged in.", None
        return _format_my_field(me, intent), None

    # ── Employee-targeted intents ─────────────────────────────────────────────
    has_entity = bool(entities.employee_id or entities.email or entities.employee_name)
    has_session = bool(session_data.get("last_employee_db_id"))

    if not has_entity and not has_session:
        return (
            "I couldn't figure out which employee you're asking about. "
            "Please mention their name, employee ID, or email.",
            None,
        )

    # Resolve employee via Node.js search
    if has_entity:
        resolve = await hrms_client.resolve_employee(
            token,
            employee_id=entities.employee_id,
            email=entities.email,
            name=entities.employee_name,
        )
    else:
        last_id = session_data["last_employee_db_id"]
        emp = await hrms_client.get_employee_by_id(token, int(last_id))
        resolve = {"status": "found", "employee": emp} if emp else {"status": "not_found"}

    # Handle resolution outcomes
    if resolve["status"] == "not_found":
        search_term = entities.employee_id or entities.email or entities.employee_name or "that"
        return (
            f"I couldn't find an employee matching '{search_term}'. "
            "Please check the name, employee ID, or email and try again.",
            None,
        )

    if resolve["status"] == "ambiguous":
        names = ", ".join(resolve["candidates"])
        return (
            f"I found multiple employees matching your query: {names}. "
            "Please provide the employee ID or email to narrow it down.",
            None,
        )

    if resolve["status"] == "unauthorized":
        return "You don't have permission to access that employee's information.", None

    emp = resolve["employee"]

    # Extra permission guard — plain employees cannot query others
    if not _can_view(current_user, emp):
        return "You don't have permission to access that employee's information.", None

    # ── EMPLOYEE_LEAVE_BALANCE ────────────────────────────────────────────────
    if intent == Intent.EMPLOYEE_LEAVE_BALANCE:
        emp_db_id = emp.get("id")
        balance = await hrms_client.get_employee_leave_balance(token, emp_db_id)
        emp_name = emp.get("name") or "The employee"
        return _format_leave_balance(balance, owner=emp_name, possessive=f"{emp_name}'s"), emp

    # ── Other employee field intents ──────────────────────────────────────────
    answer = _format_employee_field(emp, intent)
    return answer, emp


# ─────────────────────────────────────────────────────────────────────────────
# Response templates  (deterministic — no AI generation)
# ─────────────────────────────────────────────────────────────────────────────

def _format_my_field(me: dict, intent: str) -> str:
    if intent == Intent.MY_PROFILE:
        supervisors = _parse_supervisors(me.get("supervisors"))
        manager = supervisors[0] if supervisors else None
        status = me.get("employment_status") or ("Active" if me.get("is_active") else "Inactive")

        def row(label: str, value) -> str | None:
            """Return a formatted row, or None if value is empty."""
            if not value or str(value).strip().lower() in ("none", "null", "0", ""):
                return None
            return f"  {label:<16} {value}"

        lines = [f"👤 {me.get('name', 'Unknown')}"]
        lines.append("")

        rows = [
            row("Employee ID",  me.get("employee_id")),
            row("Email",        me.get("email")),
            row("Mobile",       me.get("mobile")),
            row("Department",   me.get("sub_unit")),
            row("Designation",  me.get("job_title")),
            row("Location",     me.get("location")),
            row("Joining Date", me.get("joined_date")),
            row("Manager",      manager),
            row("Status",       status),
        ]
        lines += [r for r in rows if r is not None]
        return "\n".join(lines)

    if intent == Intent.MY_EMAIL:
        val = me.get("email")
        return f"Your email is {val}." if val else "No email address on record."

    if intent == Intent.MY_PHONE:
        val = me.get("mobile") or me.get("work_tel") or me.get("home_tel")
        return f"Your mobile number is {val}." if val else "No phone number on record."

    if intent == Intent.MY_DEPARTMENT:
        val = me.get("sub_unit")
        return f"You are in the {val} department." if val else "Your department is not set."

    if intent == Intent.MY_DESIGNATION:
        val = me.get("job_title")
        return f"Your designation is {val}." if val else "Your designation is not set."

    if intent == Intent.MY_MANAGER:
        supervisors = _parse_supervisors(me.get("supervisors"))
        return f"Your manager is {supervisors[0]}." if supervisors else "No manager is currently assigned to you."

    if intent == Intent.MY_JOINING_DATE:
        val = me.get("joined_date")
        return f"Your joining date is {val}." if val else "Your joining date is not recorded."

    if intent == Intent.MY_STATUS:
        val = me.get("employment_status") or ("Active" if me.get("is_active") else "Inactive")
        return f"Your employment status is {val}."

    if intent == Intent.MY_LOCATION:
        val = me.get("location")
        return f"Your work location is {val}." if val else "Your location is not set."

    return "I couldn't retrieve that information from your profile."


def _format_leave_balance(balance: Any, owner: str, possessive: str) -> str:
    """
    Format leave balance response.
    DB columns: leave_type_name, total_days, used_days, carried_days, net_balance
    """
    if balance is None:
        return (
            f"I couldn't fetch {possessive.lower()} leave balance. "
            "Please check the Leave module directly or contact HR."
        )

    if not isinstance(balance, list) or len(balance) == 0:
        return (
            f"No leave entitlements found for {owner}. "
            "Leave entitlements may not have been assigned yet."
        )

    # Get year from first record if available
    year = balance[0].get("year", datetime.now().year)
    lines = [f"{possessive} leave balance ({year}):"]

    for item in balance:
        lt      = item.get("leave_type_name") or item.get("name") or "Leave"
        used    = float(item.get("used_days") or 0)
        total   = float(item.get("total_days") or 0)
        carried = float(item.get("carried_days") or 0)
        net     = item.get("net_balance")
        net     = float(net) if net is not None else (total + carried - used)

        carried_str = f" + {carried:.0f} carried" if carried else ""
        lines.append(
            f"  • {lt}: {net:.0f} day(s) remaining"
            f"  (total {total:.0f}{carried_str}, used {used:.0f})"
        )

    return "\n".join(lines)


def _format_employee_field(emp: dict, intent: str) -> str:
    name = emp.get("name") or "The employee"
    poss = f"{name}'s"

    if intent == Intent.EMPLOYEE_PROFILE:
        supervisors = _parse_supervisors(emp.get("supervisors"))
        manager = supervisors[0] if supervisors else None
        status = emp.get("employment_status") or ("Active" if emp.get("is_active") else "Inactive")

        def row(label: str, value) -> str | None:
            if not value or str(value).strip().lower() in ("none", "null", "0", ""):
                return None
            return f"  {label:<16} {value}"

        lines = [f"👤 {emp.get('name', 'Unknown')}"]
        lines.append("")
        rows = [
            row("Employee ID",  emp.get("employee_id")),
            row("Email",        emp.get("email")),
            row("Mobile",       emp.get("mobile")),
            row("Department",   emp.get("sub_unit")),
            row("Designation",  emp.get("job_title")),
            row("Location",     emp.get("location")),
            row("Joining Date", emp.get("joined_date")),
            row("Manager",      manager),
            row("Status",       status),
        ]
        lines += [r for r in rows if r is not None]
        return "\n".join(lines)

    if intent == Intent.EMPLOYEE_EMAIL:
        val = emp.get("email")
        return f"{poss} email is {val}." if val else f"{name} has no email on record."

    if intent == Intent.EMPLOYEE_PHONE:
        val = emp.get("mobile") or emp.get("work_tel") or emp.get("home_tel")
        return f"{poss} phone number is {val}." if val else f"{name} has no phone number on record."

    if intent == Intent.EMPLOYEE_DEPARTMENT:
        val = emp.get("sub_unit")
        return f"{name} works in the {val} department." if val else f"{poss} department is not set."

    if intent == Intent.EMPLOYEE_DESIGNATION:
        val = emp.get("job_title")
        return f"{poss} designation is {val}." if val else f"{poss} designation is not set."

    if intent == Intent.EMPLOYEE_MANAGER:
        supervisors = _parse_supervisors(emp.get("supervisors"))
        return f"{poss} manager is {supervisors[0]}." if supervisors else f"No manager is assigned to {name}."

    if intent == Intent.EMPLOYEE_JOINING_DATE:
        val = emp.get("joined_date")
        return f"{name} joined on {val}." if val else f"{poss} joining date is not recorded."

    if intent == Intent.EMPLOYEE_STATUS:
        val = emp.get("employment_status") or ("Active" if emp.get("is_active") else "Inactive")
        return f"{name} is currently {val}."

    if intent == Intent.EMPLOYEE_LOCATION:
        val = emp.get("location")
        return f"{name} works at {val}." if val else f"{poss} location is not set."

    return f"I couldn't retrieve that information for {name}."


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_supervisors(raw) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _can_view(current_user: CurrentUser, emp: dict) -> bool:
    admin_roles = {"hradmin", "empmanager"}
    supervisor_roles = {"supervisor", "manager", "line_manager", "reporting_manager"}
    if current_user.role in admin_roles:
        return True
    if current_user.role in supervisor_roles:
        return True
    return current_user.user_id == emp.get("id")
