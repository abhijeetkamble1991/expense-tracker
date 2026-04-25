import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch) -> TestClient:
    from app.core.config import settings
    from app.db.session import get_engine

    monkeypatch.setattr(
        settings,
        "database_url",
        f"sqlite:///{tmp_path / 'test.db'}",
    )
    get_engine.cache_clear()

    from app.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client

    engine = get_engine()
    engine.dispose()
    get_engine.cache_clear()


@pytest.fixture
def auth_headers(client) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        json={"username": "owner", "password": "secret123"},
    )
    assert response.status_code == 200
    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def seeded_month_data(client, auth_headers) -> dict[str, int]:
    groceries_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert groceries_response.status_code == 201

    utilities_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Utilities"},
    )
    assert utilities_response.status_code == 201

    common_transaction = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-05",
            "amount": "425.00",
            "description": "Electricity bill",
            "merchant": "BESCOM",
            "month_key": "2026-04",
            "expense_category": "common",
            "spend_category_id": utilities_response.json()["id"],
        },
    )
    assert common_transaction.status_code == 201

    personal_transaction = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "1850.50",
            "description": "Weekend groceries",
            "merchant": "Nature Basket",
            "month_key": "2026-04",
            "expense_category": "personal",
            "spend_category_id": groceries_response.json()["id"],
        },
    )
    assert personal_transaction.status_code == 201

    return {
        "groceries_id": groceries_response.json()["id"],
        "utilities_id": utilities_response.json()["id"],
    }
