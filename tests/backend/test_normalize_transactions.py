from app.services.parsers.base import ParsedRow
from app.services.parsers.normalize import normalize_parsed_row


def test_normalize_parsed_row_marks_imported_expense_for_review():
    row = ParsedRow(
        transaction_date="2026-04-09",
        posted_date=None,
        amount="425.00",
        description="UPI/FOODMART/12345",
        merchant_guess="FOODMART",
        direction="debit",
        source_reference="12345",
    )

    normalized = normalize_parsed_row(row=row, month_key="2026-04", source_type="upi_pdf")

    assert normalized.review_status == "needs_review"
    assert normalized.expense_category == "personal"
    assert normalized.source_type == "upi_pdf"
