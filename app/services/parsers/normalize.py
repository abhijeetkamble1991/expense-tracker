from dataclasses import dataclass
from datetime import datetime

from app.services.parsers.base import ParsedRow


@dataclass(slots=True)
class NormalizedImportRow:
    transaction_date: str
    posted_date: str | None
    amount: str
    description: str
    raw_merchant: str
    merchant: str
    month_key: str
    source_type: str
    expense_category: str
    review_status: str
    source_reference: str | None


def _normalize_date(value: str | None) -> str | None:
    if value is None:
        return None

    return datetime.strptime(value, "%d/%m/%Y").date().isoformat()


def normalize_parsed_row(row: ParsedRow, month_key: str, source_type: str) -> NormalizedImportRow:
    return NormalizedImportRow(
        transaction_date=_normalize_date(row.transaction_date),
        posted_date=_normalize_date(row.posted_date),
        amount=row.amount,
        description=row.description,
        raw_merchant=row.merchant_guess,
        merchant=row.merchant_guess,
        month_key=month_key,
        source_type=source_type,
        expense_category="personal",
        review_status="needs_review",
        source_reference=row.source_reference,
    )
