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
    assert body["by_spend_category"] == {
        "Groceries": "1850.50",
        "Utilities": "425.00",
    }
    assert body["unresolved_count"] == 0
    assert body["totals"]["common_reimburse"] == "0.00"
    assert body["totals"]["personal_reimburse"] == "0.00"


def test_regenerate_report_returns_reimburse_subtotals(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Utilities"},
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]

    reimbursable = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-05",
            "amount": "425.00",
            "description": "Electricity bill",
            "merchant": "BESCOM",
            "month_key": "2026-04",
            "expense_category": "common",
            "spend_category_id": category_id,
            "reimburse": True,
        },
    )
    assert reimbursable.status_code == 201

    non_reimbursable = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-06",
            "amount": "100.00",
            "description": "Water bill",
            "merchant": "BWSSB",
            "month_key": "2026-04",
            "expense_category": "common",
            "spend_category_id": category_id,
            "reimburse": False,
        },
    )
    assert non_reimbursable.status_code == 201

    report_response = client.post("/reports/2026-04/regenerate", headers=auth_headers)

    assert report_response.status_code == 200
    body = report_response.json()
    assert body["totals"]["common"] == "525.00"
    assert body["totals"]["common_reimburse"] == "425.00"
    assert body["totals"]["personal_reimburse"] == "0.00"


def test_regenerate_report_excludes_unreviewed_transactions_from_totals(
    client,
    auth_headers,
):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]

    reviewed_transaction = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "100.00",
            "description": "Reviewed lunch",
            "merchant": "Cafe",
            "month_key": "2026-04",
            "expense_category": "personal",
            "spend_category_id": category_id,
        },
    )
    assert reviewed_transaction.status_code == 201

    pending_transaction = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-12",
            "amount": "50.00",
            "description": "Pending snack",
            "merchant": "Snack Shop",
            "month_key": "2026-04",
            "expense_category": "personal",
            "spend_category_id": category_id,
        },
    )
    assert pending_transaction.status_code == 201

    move_to_review = client.patch(
        f"/transactions/{pending_transaction.json()['id']}",
        headers=auth_headers,
        json={"review_status": "needs_review"},
    )
    assert move_to_review.status_code == 200

    report_response = client.post("/reports/2026-04/regenerate", headers=auth_headers)

    assert report_response.status_code == 200
    body = report_response.json()
    assert body["totals"]["overall"] == "100.00"
    assert body["totals"]["personal"] == "100.00"
    assert body["by_spend_category"] == {"Groceries": "100.00"}
    assert len(body["transactions"]) == 1
    assert body["transactions"][0]["description"] == "Reviewed lunch"
    assert body["unresolved_count"] == 1


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
