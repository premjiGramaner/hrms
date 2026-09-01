"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_employee, make_token


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession):
    await create_test_employee(
        db_session,
        email="auth.test@example.com",
        password="correct_password",
        employee_id="EMP9001",
    )

    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "auth.test@example.com", "password": "correct_password"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    await create_test_employee(
        db_session,
        email="auth.wrong@example.com",
        password="correct_password",
        employee_id="EMP9002",
    )

    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "auth.wrong@example.com", "password": "wrong_password"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient, db_session: AsyncSession):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "nobody@example.com", "password": "anypass"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, db_session: AsyncSession):
    emp = await create_test_employee(
        db_session,
        email="me.test@example.com",
        employee_id="EMP9003",
    )
    token = make_token(emp.id, role="employee")

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == emp.id
    assert data["email"] == emp.email


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 403
