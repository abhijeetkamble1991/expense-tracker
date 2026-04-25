from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models.merchant_rule import MerchantRule
from app.models.transaction import Transaction
from app.services.parsers.base import ParsedRow
from tests.backend.pdf_factory import build_text_pdf


def test_create_import_batch(client, auth_headers, monkeypatch):
    from app.services.imports import NormalizedImportRow

    def fake_process_pdf_upload(*, db, file_bytes, filename, source_type):
        _ = db
        _ = file_bytes
        _ = filename
        _ = source_type
        return (
            {
                "month_key": "2026-04",
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
                    transaction_time=None,
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
        data={"source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["month_key"] == "2026-04"
    assert body["parse_status"] == "success"
    assert body["extracted_count"] == 1


def test_import_extracts_credit_card_transactions_from_real_pdf_bytes(
    client,
    auth_headers,
):
    statement_pdf = build_text_pdf(
        [
            "Credit Card Statement",
            "Txn Date Post Date Description Amount Type",
            "09/04/2026 10/04/2026 SWIGGY ONLINE 550.00 DR",
            "12/04/2026 13/04/2026 AMAZON PAY INDIA 1299.99 DR",
            "15/04/2026 16/04/2026 CASHBACK REWARD 50.00 CR",
        ]
    )

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", statement_pdf, "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["month_key"] == "2026-04"
    assert body["parse_status"] == "success"
    assert body["extracted_count"] == 2

    with Session(get_engine()) as db:
        imported_transactions = db.scalars(
            select(Transaction)
            .where(Transaction.import_batch_id == body["id"])
            .order_by(Transaction.transaction_date, Transaction.id)
        ).all()

    assert [transaction.merchant for transaction in imported_transactions] == [
        "SWIGGY ONLINE",
        "AMAZON PAY INDIA",
    ]


def test_import_extracts_upi_transactions_from_real_pdf_bytes(
    client,
    auth_headers,
):
    statement_pdf = build_text_pdf(
        [
            "Account Statement",
            "Date Description Amount Type",
            "09/04/2026 UPI/FOODMART/12345 425.00 DR",
            "10/04/2026 UPI/BOOKSTORE/67890 899.00 DR",
            "11/04/2026 UPI/REFUND/54321 100.00 CR",
        ]
    )

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"source_type": "upi_pdf"},
        files={"file": ("upi-statement.pdf", statement_pdf, "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["month_key"] == "2026-04"
    assert body["parse_status"] == "success"
    assert body["extracted_count"] == 2

    with Session(get_engine()) as db:
        imported_transactions = db.scalars(
            select(Transaction)
            .where(Transaction.import_batch_id == body["id"])
            .order_by(Transaction.transaction_date, Transaction.id)
        ).all()

    assert [transaction.merchant for transaction in imported_transactions] == [
        "FOODMART",
        "BOOKSTORE",
    ]


def test_import_extracts_bank_statement_debit_transactions_from_real_pdf_bytes(
    client,
    auth_headers,
):
    statement_pdf = build_text_pdf(
        [
            "Statement of Axis Account No: 921010037957541 for the period (From: 19-01-2026  To: 19-04-2026)",
            "Tran Date Chq No Particulars Debit Credit Balance Init.",
            "Br",
            "OPENING BALANCE            14948.84",
            "19-01-2026",
            "MOB/SELFFT/915010052853322/915010052853",
            "322",
            "3645.00             11303.84 073",
            "21-01-2026",
            "UPI/P2M/817827336319/URBAN COMPANY",
            "/UPIInt/HDFC BANK LTD",
            "1288.00             10015.84 073",
            "27-01-2026",
            "UPI/P2A/709647202195/SHARAYU",
            "R/HDFC/Monthly/",
            "25000.00             35015.84 073",
            "23-01-2026",
            "UPI/P2M/184106488449/ZOMATO",
            "/Paymen/HDFC BANK LTD",
            "526.40              34489.44 073",
            "18-04-2026",
            "MOB/SELFFT/915010052853322/915010052853",
            "322",
            "7407.00              27082.44 073",
        ]
    )

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"source_type": "bank_statement_pdf"},
        files={"file": ("bank-statement.pdf", statement_pdf, "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source_type"] == "bank_statement_pdf"
    assert body["parse_status"] == "success"
    assert body["extracted_count"] == 4

    with Session(get_engine()) as db:
        imported_transactions = db.scalars(
            select(Transaction)
            .where(Transaction.import_batch_id == body["id"])
            .order_by(Transaction.id)
        ).all()

    assert [transaction.merchant for transaction in imported_transactions] == [
        "MOB/SELFFT/915010052853322/915010052853/322",
        "URBAN COMPANY",
        "ZOMATO",
        "MOB/SELFFT/915010052853322/915010052853/322",
    ]


def test_import_extracts_phonepe_upi_transactions_from_real_pdf_bytes(
    client,
    auth_headers,
):
    statement_pdf = build_text_pdf(
        [
            "Transaction Statement for +919028308428",
            "Mar 20, 2026 - Apr 19, 2026",
            "Date Transaction Details Type Amount",
            "Mar 20, 2026",
            "07:05 PM",
            "Paid to THE LIQUOR STORY 2",
            "Transaction ID : T2603201905499312518350",
            "UTR No : 234799728118",
            "Debited from XX3322",
            "Debit INR 340.00",
            "Mar 20, 2026",
            "07:06 PM",
            "Paid to Vishal Wines Shop",
            "Transaction ID : T2603201906528032199746",
            "UTR No : 320046592500",
            "Debited from XX3322",
            "Debit INR 30.00",
            "Mar 21, 2026",
            "12:35 AM",
            "Received from AMOL BHIMRAO SELOKAR",
            "Transaction ID : T2603210035449245561565",
            "UTR No : 644621652235",
            "Credited to XX3322",
            "Credit INR 200.00",
        ]
    )

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"source_type": "upi_pdf"},
        files={"file": ("phonepe-upi-statement.pdf", statement_pdf, "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["month_key"] == "2026-03"
    assert body["parse_status"] == "success"
    assert body["extracted_count"] == 2

    with Session(get_engine()) as db:
        imported_transactions = db.scalars(
            select(Transaction)
            .where(Transaction.import_batch_id == body["id"])
            .order_by(Transaction.transaction_date, Transaction.id)
        ).all()

    assert [transaction.merchant for transaction in imported_transactions] == [
        "THE LIQUOR STORY 2",
        "Vishal Wines Shop",
    ]
    assert [transaction.transaction_time for transaction in imported_transactions] == [
        "07:05 PM",
        "07:06 PM",
    ]


def test_import_marks_batch_with_detected_primary_month_when_statement_spans_multiple_months(
    client,
    auth_headers,
):
    statement_pdf = build_text_pdf(
        [
            "Credit Card Statement",
            "Txn Date Post Date Description Amount Type",
            "30/03/2026 31/03/2026 TRAIN TICKET 800.00 DR",
            "02/04/2026 03/04/2026 SWIGGY ONLINE 550.00 DR",
            "09/04/2026 10/04/2026 AMAZON PAY INDIA 1299.99 DR",
        ]
    )

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", statement_pdf, "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["month_key"] == "2026-04"


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
        data={"source_type": "credit_card_pdf"},
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


def test_import_does_not_guess_spend_category_for_ambiguous_canonical_merchant(
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
                amount="725.00",
                description="SWIGGY ORDER",
                merchant_guess="Swiggy",
                direction="debit",
                source_reference="import-rule-002",
            )
        ]

    monkeypatch.setattr("app.services.imports.parse_credit_card_statement_text", fake_parse)

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"source_type": "credit_card_pdf"},
        files={"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 201

    with Session(get_engine()) as db:
        imported_transaction = db.scalar(
            select(Transaction)
            .where(Transaction.source_reference == "import-rule-002")
            .order_by(Transaction.id.desc())
        )

        assert imported_transaction is not None
        assert imported_transaction.merchant == "Swiggy"
        assert imported_transaction.spend_category_id is None
