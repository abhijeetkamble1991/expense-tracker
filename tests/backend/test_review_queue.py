from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models.merchant_rule import MerchantRule
from app.models.transaction import Transaction
from app.services.parsers.base import ParsedRow


def test_review_queue_patch_updates_transaction(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Food Delivery"},
    )
    assert category_response.status_code == 201

    create_response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "1850.50",
            "description": "Weekend groceries",
            "merchant": "Nature Basket",
            "month_key": "2026-04",
            "expense_category": "personal",
            "spend_category_id": category_response.json()["id"],
            "notes": "manual catch-up",
        },
    )
    assert create_response.status_code == 201

    transaction_id = create_response.json()["id"]

    update_response = client.patch(
        f"/transactions/{transaction_id}",
        headers=auth_headers,
        json={
            "merchant": "Swiggy",
            "expense_category": "common",
            "spend_category_id": category_response.json()["id"],
            "review_status": "reviewed",
        },
    )

    assert update_response.status_code == 200
    body = update_response.json()
    assert body["merchant"] == "Swiggy"
    assert body["expense_category"] == "common"
    assert body["spend_category_id"] == category_response.json()["id"]
    assert body["review_status"] == "reviewed"


def test_review_correction_reuses_rule_for_future_raw_merchant_imports(
    client,
    auth_headers,
    monkeypatch,
):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Food Delivery"},
    )
    assert category_response.status_code == 201
    spend_category_id = category_response.json()["id"]

    def fake_first_parse(raw_text):
        _ = raw_text
        return [
            ParsedRow(
                transaction_date="09/04/2026",
                posted_date="10/04/2026",
                amount="550.00",
                description="SWIGGY ORDER",
                merchant_guess="SWIGGY ONLINE",
                direction="debit",
                source_reference="txn-001",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_first_parse)

    first_import_response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert first_import_response.status_code == 201

    with Session(get_engine()) as db:
        first_transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "txn-001")
            .order_by(Transaction.id.desc())
        )
        assert first_transaction is not None
        first_transaction_id = first_transaction.id

    review_response = client.patch(
        f"/transactions/{first_transaction_id}",
        headers=auth_headers,
        json={
            "merchant": "Swiggy",
            "expense_category": "common",
            "spend_category_id": spend_category_id,
            "review_status": "reviewed",
        },
    )
    assert review_response.status_code == 200

    def fake_second_parse(raw_text):
        _ = raw_text
        return [
            ParsedRow(
                transaction_date="12/04/2026",
                posted_date="13/04/2026",
                amount="725.00",
                description="SWIGGY REORDER",
                merchant_guess="SWIGGY ONLINE",
                direction="debit",
                source_reference="txn-002",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_second_parse)

    second_import_response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement-2.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert second_import_response.status_code == 201

    with Session(get_engine()) as db:
        merchant_rule = db.scalar(
            select(MerchantRule).where(MerchantRule.merchant_key == "swiggy online")
        )
        imported_transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "txn-002")
            .order_by(Transaction.id.desc())
        )

        assert merchant_rule is not None
        assert merchant_rule.canonical_merchant == "Swiggy"
        assert imported_transaction is not None
        assert imported_transaction.merchant == "Swiggy"
        assert imported_transaction.expense_category == "common"
        assert imported_transaction.spend_category_id == spend_category_id
