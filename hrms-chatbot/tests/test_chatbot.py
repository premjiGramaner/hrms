"""
Chatbot endpoint tests.

NLP models are mocked — tests verify the full pipeline from HTTP request
through intent routing, permission checks, DB query, to response shape.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.chatbot import EntityResult, IntentResult
from app.nlp.model_config import Intent
from tests.conftest import create_test_employee, make_token


def _mock_nlp(intent: str, confidence: float = 0.95, **entity_kwargs):
    """
    Return context managers that mock intent classifier and entity extractor.
    Pass entity_kwargs like employee_name="John Smith" to set entity fields.
    """
    clf_mock = MagicMock()
    clf_mock.predict.return_value = IntentResult(intent=intent, confidence=confidence)

    ext_mock = MagicMock()
    ext_mock.extract.return_value = EntityResult(**entity_kwargs)

    return clf_mock, ext_mock


@pytest.mark.asyncio
async def test_chat_get_email(client: AsyncClient, db_session: AsyncSession):
    emp = await create_test_employee(
        db_session,
        first_name="John", last_name="Smith",
        email="john.smith@example.com",
        employee_id="EMP7001",
        role="employee",
    )
    # Admin asking about another employee
    admin = await create_test_employee(
        db_session,
        first_name="Admin", last_name="User",
        email="admin7@example.com",
        employee_id="EMP7002",
        role="hradmin",
    )
    token = make_token(admin.id, role="hradmin")

    clf, ext = _mock_nlp(Intent.EMPLOYEE_EMAIL, employee_name="John Smith")

    with patch("app.services.intent_service.get_intent_classifier", return_value=clf), \
         patch("app.services.entity_service.get_entity_extractor", return_value=ext):

        resp = await client.post(
            "/api/v1/chat",
            json={"message": "What is John Smith's email?"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == Intent.EMPLOYEE_EMAIL
    assert "john.smith@example.com" in data["answer"]
    assert data["confidence"] == 0.95


@pytest.mark.asyncio
async def test_chat_my_profile(client: AsyncClient, db_session: AsyncSession):
    emp = await create_test_employee(
        db_session,
        email="self7@example.com",
        employee_id="EMP7003",
        job_title="Developer",
        sub_unit="Engineering",
    )
    token = make_token(emp.id, role="employee")

    clf, ext = _mock_nlp(Intent.MY_PROFILE)

    with patch("app.services.intent_service.get_intent_classifier", return_value=clf), \
         patch("app.services.entity_service.get_entity_extractor", return_value=ext):

        resp = await client.post(
            "/api/v1/chat",
            json={"message": "Show my profile"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == Intent.MY_PROFILE
    assert "Developer" in data["answer"]
    assert "Engineering" in data["answer"]


@pytest.mark.asyncio
async def test_chat_employee_not_found(client: AsyncClient, db_session: AsyncSession):
    admin = await create_test_employee(
        db_session,
        email="adm7nf@example.com",
        employee_id="EMP7004",
        role="hradmin",
    )
    token = make_token(admin.id, role="hradmin")

    clf, ext = _mock_nlp(Intent.EMPLOYEE_EMAIL, employee_name="Nobody Here")

    with patch("app.services.intent_service.get_intent_classifier", return_value=clf), \
         patch("app.services.entity_service.get_entity_extractor", return_value=ext):

        resp = await client.post(
            "/api/v1/chat",
            json={"message": "What is Nobody Here's email?"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert "couldn't find" in data["answer"].lower()


@pytest.mark.asyncio
async def test_chat_permission_denied_employee_viewing_other(
    client: AsyncClient, db_session: AsyncSession
):
    emp1 = await create_test_employee(
        db_session, email="e1@example.com", employee_id="EMP7005"
    )
    emp2 = await create_test_employee(
        db_session, email="e2@example.com", employee_id="EMP7006",
        first_name="Alice", last_name="Jones",
    )
    token = make_token(emp1.id, role="employee")

    clf, ext = _mock_nlp(Intent.EMPLOYEE_EMAIL, employee_name="Alice Jones")

    with patch("app.services.intent_service.get_intent_classifier", return_value=clf), \
         patch("app.services.entity_service.get_entity_extractor", return_value=ext):

        resp = await client.post(
            "/api/v1/chat",
            json={"message": "What is Alice Jones's email?"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert "permission" in data["answer"].lower()


@pytest.mark.asyncio
async def test_chat_unknown_intent(client: AsyncClient, db_session: AsyncSession):
    emp = await create_test_employee(
        db_session, email="unk7@example.com", employee_id="EMP7007"
    )
    token = make_token(emp.id, role="employee")

    clf, ext = _mock_nlp(Intent.UNKNOWN, confidence=0.30)

    with patch("app.services.intent_service.get_intent_classifier", return_value=clf), \
         patch("app.services.entity_service.get_entity_extractor", return_value=ext):

        resp = await client.post(
            "/api/v1/chat",
            json={"message": "What is the weather like today?"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == Intent.UNKNOWN
    assert "don't understand" in data["answer"].lower()


@pytest.mark.asyncio
async def test_chat_session_context(client: AsyncClient, db_session: AsyncSession):
    """Second message should resolve employee from session context (no entity)."""
    emp = await create_test_employee(
        db_session,
        first_name="Bob", last_name="Taylor",
        email="bob.taylor@example.com",
        employee_id="EMP7008",
    )
    admin = await create_test_employee(
        db_session,
        email="admctx@example.com",
        employee_id="EMP7009",
        role="hradmin",
    )
    token = make_token(admin.id, role="hradmin")

    clf, ext = _mock_nlp(Intent.EMPLOYEE_PROFILE, employee_name="Bob Taylor")
    with patch("app.services.intent_service.get_intent_classifier", return_value=clf), \
         patch("app.services.entity_service.get_entity_extractor", return_value=ext):

        r1 = await client.post(
            "/api/v1/chat",
            json={"message": "Show Bob Taylor", "session_id": "test-sess-001"},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r1.status_code == 200
    session_id = r1.json()["session_id"]

    # Follow-up with no entity — should use session context
    clf2, ext2 = _mock_nlp(Intent.EMPLOYEE_EMAIL)  # no employee_name
    with patch("app.services.intent_service.get_intent_classifier", return_value=clf2), \
         patch("app.services.entity_service.get_entity_extractor", return_value=ext2):

        r2 = await client.post(
            "/api/v1/chat",
            json={"message": "What is his email?", "session_id": session_id},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r2.status_code == 200
    assert "bob.taylor@example.com" in r2.json()["answer"]


@pytest.mark.asyncio
async def test_chat_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/v1/chat", json={"message": "Hello"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_intent_classification_mapping():
    """Unit test: intent classifier returns correct structure."""
    from app.schemas.chatbot import IntentResult
    from app.nlp.model_config import Intent

    result = IntentResult(intent=Intent.EMPLOYEE_EMAIL, confidence=0.95)
    assert result.intent == "EMPLOYEE_EMAIL"
    assert result.confidence == 0.95


@pytest.mark.asyncio
async def test_entity_extraction_employee_id():
    """Unit test: entity extractor finds EMP ID correctly."""
    from app.nlp.entity_extractor import EntityExtractor

    ext = EntityExtractor()
    # Disable NER so we test deterministic path only
    ext._ner_loaded = True
    ext._ner_available = False

    result = ext.extract("Show me employee EMP1024")
    assert result.employee_id == "EMP1024"


@pytest.mark.asyncio
async def test_entity_extraction_email():
    """Unit test: entity extractor finds email correctly."""
    from app.nlp.entity_extractor import EntityExtractor

    ext = EntityExtractor()
    ext._ner_loaded = True
    ext._ner_available = False

    result = ext.extract("Find john.smith@example.com")
    assert result.email == "john.smith@example.com"
