"""Pydantic schemas for the chatbot API."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: Optional[str] = Field(default=None, max_length=128)

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "What is John Smith's email?",
                "session_id": "sess_abc123",
            }
        }
    }


class ChatResponse(BaseModel):
    intent: str
    confidence: float
    entities: dict[str, Any]
    answer: str
    session_id: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "intent": "EMPLOYEE_EMAIL",
                "confidence": 0.96,
                "entities": {"employee_name": "John Smith"},
                "answer": "John Smith's email is john.smith@example.com",
                "session_id": "sess_abc123",
            }
        }
    }


class IntentResult(BaseModel):
    """Internal result from the intent classifier."""
    intent: str
    confidence: float


class EntityResult(BaseModel):
    """Internal result from the entity extractor."""
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
