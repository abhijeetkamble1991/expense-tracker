from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models.merchant_rule import MerchantRule
from app.models.transaction import Transaction
from app.services.parsers.base import ParsedRow


def test_create_import_batch(client, auth_headers, monkeypatch):
    from app.services.imports import NormalizedImportRow

    def fake_process_pdf_upload(*, db, file_bytes, filename, month_key, source_type):
        _ = db
        _ = file_bytes
        _ = filename
        _ = month_key
        _ = source_type
        return (
            {
                "source_type": "credit_card_pdf",
                "parser_type": "credit_card",
                "parse_status": "success",
                "warnings": [],
            },
            [
                NormalizedImportRow(
                    transaction_date="2026-04-09",
                    posted_date="2026-04-10",
                    amount="550.00",
                    description="SWIGGY ORDER",
                    raw_merchant="SWIGGY ONLINE",
                    merchant="SWIGGY ONLINE",
                    month_key="2026-04",
                    source_type="credit_card_pdf",
                    expense_category="personal",
                    review_status="needs_review",
                    source_reference="txn-001",
                )
            ],
        )

    monkeypatch.setattr(
        "app.api.routes.imports.process_pdf_upload",
        fake_process_pdf_upload,
    )

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["parse_status"] == "success"
    assert body["extracted_count"] == 1


def test_import_uses_raw_merchant_rule_for_spend_category_when_canonical_merchants_overlap(
    client,
    auth_headers,
    monkeypatch,
):
    food_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Food Delivery"},
    )
    assert food_response.status_code == 201

    grocery_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert grocery_response.status_code == 201

    with Session(get_engine()) as db:
        db.add(
            MerchantRule(
                merchant_key="swiggy online",
                canonical_merchant="Swiggy",
                expense_category="common",
                spend_category_id=food_response.json()["id"],
            )
        )
        db.add(
            MerchantRule(
                merchant_key="swiggy instamart",
                canonical_merchant="Swiggy",
                expense_category="personal",
                spend_category_id=grocery_response.json()["id"],
            )
        )
        db.commit()

    def fake_parse(raw_text):
        _ = raw_text
        return [
            ParsedRow(
                transaction_date="09/04/2026",
                posted_date="10/04/2026",
                amount="650.00",
                description="SWIGGY INSTAMART ORDER",
                merchant_guess="SWIGGY INSTAMART",
                direction="debit",
                source_reference="import-rule-001",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_parse)

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 201

    with Session(get_engine()) as db:
        imported_transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "import-rule-001")
            .order_by(Transaction.id.desc())
        )

        assert imported_transaction is not None
        assert imported_transaction.merchant == "Swiggy"
        assert imported_transaction.spend_category_id == grocery_response.json()["id"]
