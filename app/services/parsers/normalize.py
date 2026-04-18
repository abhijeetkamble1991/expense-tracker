from dataclasses import dataclass

from app.services.parsers.base import ParsedRow


@dataclass(slots=True)
class NormalizedImportRow:
    transaction_date: str
    amount: str
    description: str
    merchant: str
    month_key: str
    source_type: str
    expense_category: str
    review_status: str
    source_reference: str | None


def normalize_parsed_row(row: ParsedRow, month_key: str, source_type: str) -> NormalizedImportRow:
    return NormalizedImportRow(
        transaction_date=row.transaction_date,
        amount=row.amount,
        description=row.description,
        merchant=row.merchant_guess,
        month_key=month_key,
        source_type=source_type,
        expense_category="personal",
        review_status="needs_review",
        source_reference=row.source_reference,
    )
