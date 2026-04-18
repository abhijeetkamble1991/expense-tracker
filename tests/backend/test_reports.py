import sqlite3

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_engine


def test_regenerate_report_returns_summary_for_month(
    client,
    auth_headers,
    seeded_month_data,
):
    _ = seeded_month_data

    response = client.post("/reports/2026-04/regenerate", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["month_key"] == "2026-04"
    assert body["totals"]["overall"] == "2275.50"
    assert body["totals"]["common"] == "425.00"


def test_regenerate_report_rejects_invalid_month_format(client, auth_headers):
    response = client.post("/reports/2026-13/regenerate", headers=auth_headers)

    assert response.status_code == 422
    assert response.json() == {"detail": "month_key must match YYYY-MM"}


def test_regenerate_report_returns_not_found_for_missing_month(client, auth_headers):
    response = client.post("/reports/2026-05/regenerate", headers=auth_headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "No transactions found for month"}


def test_regenerate_report_upgrades_legacy_monthly_reports_table_and_stores_snapshot(
    tmp_path,
    monkeypatch,
):
    database_path = tmp_path / "legacy.db"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE monthly_reports (
                id INTEGER PRIMARY KEY,
                month_key VARCHAR(7) NOT NULL UNIQUE,
                totals_json TEXT NOT NULL DEFAULT '{}',
                by_source_json TEXT NOT NULL DEFAULT '{}',
                by_merchant_json TEXT NOT NULL DEFAULT '{}',
                by_spend_category_json TEXT NOT NULL DEFAULT '{}',
                generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()

    from app.core.config import settings

    monkeypatch.setattr(settings, "database_url", f"sqlite:///{database_path}")
    get_engine.cache_clear()

    from app.main import create_app

    with TestClient(create_app()) as client:
        auth_response = client.post(
            "/auth/login",
            json={"username": "owner", "password": "secret123"},
        )
        assert auth_response.status_code == 200
        auth_headers = {
            "Authorization": f"Bearer {auth_response.json()['access_token']}",
        }

        groceries_response = client.post(
            "/spend-categories",
            headers=auth_headers,
            json={"name": "Groceries"},
        )
        assert groceries_response.status_code == 201

        transaction_response = client.post(
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
        assert transaction_response.status_code == 201

        report_response = client.post("/reports/2026-04/regenerate", headers=auth_headers)
        assert report_response.status_code == 200

        with Session(get_engine()) as db:
            columns = {
                row[1]
                for row in db.execute(text("PRAGMA table_info(monthly_reports)")).all()
            }
            assert {
                "total_amount",
                "common_amount",
                "personal_amount",
                "unresolved_count",
                "summary_json",
            } <= columns

            stored_report = db.execute(
                text(
                    """
                    SELECT month_key, total_amount, common_amount, personal_amount, unresolved_count
                    FROM monthly_reports
                    WHERE month_key = :month_key
                    """
                ),
                {"month_key": "2026-04"},
            ).one()

        assert stored_report == ("2026-04", 1850.5, 0, 1850.5, 0)

    engine = get_engine()
    engine.dispose()
    get_engine.cache_clear()
