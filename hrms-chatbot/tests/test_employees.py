"""Tests for employee endpoints and permission checks."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_employee, make_token


@pytest.mark.asyncio
async def test_list_employees_as_admin(client: AsyncClient, db_session: AsyncSession):
    admin = await create_test_employee(
        db_session, email="admin@example.com", role="hradmin", employee_id="EMP8001"
    )
    token = make_token(admin.id, role="hradmin")

    resp = await client.get(
        "/api/v1/employees",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_list_employees_as_plain_employee_denied(
    client: AsyncClient, db_session: AsyncSession
):
    emp = await create_test_employee(
        db_session, email="plain@example.com", role="employee", employee_id="EMP8002"
    )
    token = make_token(emp.id, role="employee")

    resp = await client.get(
        "/api/v1/employees",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_own_profile(client: AsyncClient, db_session: AsyncSession):
    emp = await create_test_employee(
        db_session, email="own@example.com", employee_id="EMP8003"
    )
    token = make_token(emp.id, role="employee")

    resp = await client.get(
        f"/api/v1/employees/{emp.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == emp.id


@pytest.mark.asyncio
async def test_get_other_employee_as_plain_employee_denied(
    client: AsyncClient, db_session: AsyncSession
):
    emp1 = await create_test_employee(
        db_session, email="emp1@example.com", employee_id="EMP8004"
    )
    emp2 = await create_test_employee(
        db_session, email="emp2@example.com", employee_id="EMP8005"
    )
    token = make_token(emp1.id, role="employee")

    resp = await client.get(
        f"/api/v1/employees/{emp2.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_employee_as_admin(client: AsyncClient, db_session: AsyncSession):
    admin = await create_test_employee(
        db_session, email="admview@example.com", role="hradmin", employee_id="EMP8006"
    )
    target = await create_test_employee(
        db_session, email="target@example.com", employee_id="EMP8007"
    )
    token = make_token(admin.id, role="hradmin")

    resp = await client.get(
        f"/api/v1/employees/{target.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == target.id


@pytest.mark.asyncio
async def test_get_nonexistent_employee(client: AsyncClient, db_session: AsyncSession):
    admin = await create_test_employee(
        db_session, email="admne@example.com", role="hradmin", employee_id="EMP8008"
    )
    token = make_token(admin.id, role="hradmin")

    resp = await client.get(
        "/api/v1/employees/999999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_my_profile_endpoint(client: AsyncClient, db_session: AsyncSession):
    emp = await create_test_employee(
        db_session, email="myp@example.com", employee_id="EMP8009"
    )
    token = make_token(emp.id, role="employee")

    resp = await client.get(
        "/api/v1/employees/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == emp.email
