"""
Chatbot route — the only route this service exposes.

POST /api/v1/chat
"""

import logging

from fastapi import APIRouter, Depends
from app.core.security import CurrentUser, get_current_user
from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services import chatbot_service, session_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chatbot"])


@router.post(
    "",
    response_model=ChatResponse,
    summary="Send a message to the HRMS chatbot",
    description="""
Natural-language HR queries. The pipeline:

1. **Intent classification** — Hugging Face transformer (no DB access)
2. **Entity extraction** — HF NER + regex (no DB access)
3. **Employee data** — fetched from the existing HRMS Node.js API using your Bearer token
4. **Permission check** — enforced by the Node.js server + an extra guard here
5. **Response** — deterministic template, never AI-generated employee data

The chatbot adds NLP on top of the existing HRMS system. It does not duplicate any data or business logic.
    """,
)
async def chat(
    body: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> ChatResponse:
    session_id = body.session_id or session_service.new_session_id()

    logger.info(
        "Chat: user_id=%d session=%s message=%r",
        current_user.user_id, session_id, body.message[:80],
    )

    return await chatbot_service.handle_message(
        message=body.message,
        session_id=session_id,
        current_user=current_user,
    )
