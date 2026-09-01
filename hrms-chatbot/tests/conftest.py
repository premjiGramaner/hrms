"""
Pytest fixtures shared across all tests.

Uses an in-memory SQLite database so tests run without a real PostgreSQL
instance.  The NLP models are mocked so tests don't need GPU / internet.
"""

import asyncio
from typing import AsyncGenerator
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.security import create_access_token, hash_password
from app.db.database import Base, get_db
from app.db.models import Employee
from app.main import app

# ── In-memory SQLite engine for tests ────────────────────────────────────────
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create all tables in the in-memory DB once per test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Async HTTP client wired to the FastAPI app with:
      - DB overridden to use in-memory SQLite
      - NLP pipelines mocked (no model download)
    """

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Mock NLP so tests don't hit Hugging Face
    with patch("app.services.intent_service.get_intent_classifier") as mock_clf, \
         patch("app.services.entity_service.get_entity_extractor") as mock_ext:

        clf_instance = MagicMock()
        mock_clf.return_value = clf_instance

        ext_instance = MagicMock()
        mock_ext.return_value = ext_instance

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac

    app.dependency_overrides.clear()


# ── Test data factories ───────────────────────────────────────────────────────

def make_settings() -> Settings:
    return Settings(
        database_url=TEST_DB_URL,
        jwt_secret_key="test-secret-key",
        debug=True,
    )


async def create_test_employee(
    db: AsyncSession,
    *,
    first_name: str = "John",
    last_name: str = "Smith",
    email: str = "john.smith@example.com",
    role: str = "employee",
    employee_id: str = "EMP1001",
    job_title: str = "Software Engineer",
    sub_unit: str = "Engineering",
    location: str = "New York",
    password: str = "password123",
) -> Employee:
    emp = Employee(
        first_name=first_name,
        last_name=last_name,
        name=f"{first_name} {last_name}",
        email=email,
        role=role,
        employee_id=employee_id,
        job_title=job_title,
        sub_unit=sub_unit,
        location=location,
        is_active=True,
        is_deleted=False,
        employment_status="Active",
        must_change_password=False,
        password=hash_password(password),
        supervisors='["Jane Manager"]',
        mobile="555-1234",
    )
    db.add(emp)
    await db.flush()
    await db.refresh(emp)
    return emp


def make_token(user_id: int, role: str = "employee") -> str:
    settings = make_settings()
    return create_access_token(subject=user_id, role=role, settings=settings)
