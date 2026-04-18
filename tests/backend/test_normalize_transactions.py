from pathlib import Path

from app.services.parsers.credit_card import parse_credit_card_statement_text
from app.services.parsers.normalize import normalize_parsed_row


def test_normalize_parsed_row_marks_imported_expense_for_review():
    raw_text = Path("tests/backend/fixtures/credit_card_statement.txt").read_text()
    row = parse_credit_card_statement_text(raw_text)[0]

    normalized = normalize_parsed_row(
        row=row,
        month_key="2026-04",
        source_type="credit_card_pdf",
    )

    assert normalized.review_status == "needs_review"
    assert normalized.expense_category == "personal"
    assert normalized.source_type == "credit_card_pdf"
    assert normalized.transaction_date == "2026-04-09"
    assert normalized.posted_date == "2026-04-10"
    assert normalized.merchant == "SWIGGY ONLINE"
