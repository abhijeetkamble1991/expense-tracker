from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models.merchant_rule import MerchantRule
from app.models.transaction import Transaction
from app.models.import_batch import ImportBatch
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
        assert imported_transaction.duplicate_suspected is False


def test_reimport_still_marks_duplicate_after_canonical_merchant_mapping(
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
                source_reference="dup-001",
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
            .where(Transaction.source_reference == "dup-001")
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
                transaction_date="09/04/2026",
                posted_date="10/04/2026",
                amount="550.00",
                description="SWIGGY ORDER RETRY",
                merchant_guess="SWIGGY ONLINE",
                direction="debit",
                source_reference="dup-002",
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
        imported_transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "dup-002")
            .order_by(Transaction.id.desc())
        )

        assert imported_transaction is not None
        assert imported_transaction.merchant == "Swiggy"
        assert imported_transaction.duplicate_suspected is True
        assert imported_transaction.duplicate_reason is not None


def test_raw_older_import_still_duplicates_after_rule_canonicalizes_reimport(
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

    with Session(get_engine()) as db:
        batch = ImportBatch(
            month_key="2026-04",
            source_type="credit_card_pdf",
            original_filename="older.pdf",
            parser_type="credit_card",
            parse_status="success",
            extracted_count=1,
            skipped_count=0,
            flagged_count=0,
            warnings_json="[]",
        )
        db.add(batch)
        db.flush()
        db.add(
            Transaction(
                transaction_date=date.fromisoformat("2026-04-09"),
                posted_date=date.fromisoformat("2026-04-10"),
                amount=Decimal("550.00"),
                description="OLDER SWIGGY ORDER",
                merchant="SWIGGY ONLINE",
                month_key="2026-04",
                source_type="credit_card_pdf",
                expense_category="personal",
                spend_category_id=None,
                import_batch_id=batch.id,
                review_status="needs_review",
                duplicate_suspected=False,
                duplicate_reason=None,
                source_reference="legacy-001",
            )
        )
        db.add(
            MerchantRule(
                merchant_key="swiggy online",
                canonical_merchant="Swiggy",
                expense_category="common",
                spend_category_id=spend_category_id,
            )
        )
        db.commit()

    def fake_parse(raw_text):
        _ = raw_text
        return [
            ParsedRow(
                transaction_date="09/04/2026",
                posted_date="10/04/2026",
                amount="550.00",
                description="REIMPORT SWIGGY ORDER",
                merchant_guess="SWIGGY ONLINE",
                direction="debit",
                source_reference="legacy-002",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_parse)

    import_response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert import_response.status_code == 201

    with Session(get_engine()) as db:
        imported_transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "legacy-002")
            .order_by(Transaction.id.desc())
        )

        assert imported_transaction is not None
        assert imported_transaction.merchant == "Swiggy"
        assert imported_transaction.duplicate_suspected is True
        assert imported_transaction.duplicate_reason is not None


def test_second_review_pass_updates_existing_raw_keyed_rule(
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

    def fake_parse(raw_text):
        _ = raw_text
        return [
            ParsedRow(
                transaction_date="09/04/2026",
                posted_date="10/04/2026",
                amount="550.00",
                description="SWIGGY ORDER",
                merchant_guess="SWIGGY ONLINE",
                direction="debit",
                source_reference="rule-001",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_parse)

    import_response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert import_response.status_code == 201

    with Session(get_engine()) as db:
        transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "rule-001")
            .order_by(Transaction.id.desc())
        )
        assert transaction is not None
        transaction_id = transaction.id

    first_review = client.patch(
        f"/transactions/{transaction_id}",
        headers=auth_headers,
        json={
            "merchant": "Swiggy",
            "expense_category": "common",
            "spend_category_id": spend_category_id,
            "review_status": "reviewed",
        },
    )
    assert first_review.status_code == 200

    second_review = client.patch(
        f"/transactions/{transaction_id}",
        headers=auth_headers,
        json={
            "merchant": "Swiggy India",
            "expense_category": "personal",
            "spend_category_id": spend_category_id,
            "review_status": "reviewed",
        },
    )
    assert second_review.status_code == 200

    with Session(get_engine()) as db:
        raw_keyed_rule = db.scalar(
            select(MerchantRule).where(MerchantRule.merchant_key == "swiggy online")
        )
        canonical_keyed_rule = db.scalar(
            select(MerchantRule).where(MerchantRule.merchant_key == "swiggy")
        )

        assert raw_keyed_rule is not None
        assert raw_keyed_rule.canonical_merchant == "Swiggy India"
        assert raw_keyed_rule.expense_category == "personal"
        assert raw_keyed_rule.spend_category_id == spend_category_id
        assert canonical_keyed_rule is None


def test_review_patch_allows_uncategorized_imported_transaction_response(
    client,
    auth_headers,
    monkeypatch,
):
    def fake_parse(raw_text):
        _ = raw_text
        return [
            ParsedRow(
                transaction_date="09/04/2026",
                posted_date="10/04/2026",
                amount="550.00",
                description="SWIGGY ORDER",
                merchant_guess="SWIGGY ONLINE",
                direction="debit",
                source_reference="null-cat-001",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_parse)

    import_response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert import_response.status_code == 201

    with Session(get_engine()) as db:
        transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "null-cat-001")
            .order_by(Transaction.id.desc())
        )
        assert transaction is not None
        transaction_id = transaction.id

    patch_response = client.patch(
        f"/transactions/{transaction_id}",
        headers=auth_headers,
        json={
            "merchant": "Still Swiggy",
            "review_status": "needs_review",
        },
    )

    assert patch_response.status_code == 200
    body = patch_response.json()
    assert body["merchant"] == "Still Swiggy"
    assert body["spend_category_id"] is None
    assert body["review_status"] == "needs_review"


def test_reviewed_status_requires_spend_category_and_skips_rule_learning_without_one(
    client,
    auth_headers,
    monkeypatch,
):
    def fake_parse(raw_text):
        _ = raw_text
        return [
            ParsedRow(
                transaction_date="09/04/2026",
                posted_date="10/04/2026",
                amount="550.00",
                description="SWIGGY ORDER",
                merchant_guess="SWIGGY ONLINE",
                direction="debit",
                source_reference="null-cat-002",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_parse)

    import_response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04", "source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert import_response.status_code == 201

    with Session(get_engine()) as db:
        transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "null-cat-002")
            .order_by(Transaction.id.desc())
        )
        assert transaction is not None
        transaction_id = transaction.id

    patch_response = client.patch(
        f"/transactions/{transaction_id}",
        headers=auth_headers,
        json={
            "merchant": "Swiggy",
            "review_status": "reviewed",
        },
    )

    assert patch_response.status_code == 422
    assert patch_response.json() == {
        "detail": "Reviewed transactions require a spend category"
    }

    with Session(get_engine()) as db:
        refreshed_transaction = db.scalar(
            select(Transaction).where(Transaction.id == transaction_id)
        )
        learned_rule = db.scalar(
            select(MerchantRule).where(MerchantRule.merchant_key == "swiggy online")
        )

        assert refreshed_transaction is not None
        assert refreshed_transaction.review_status == "needs_review"
        assert refreshed_transaction.spend_category_id is None
        assert learned_rule is None
