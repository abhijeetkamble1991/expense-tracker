from collections import Counter
from collections.abc import Callable
from datetime import date
from decimal import Decimal
from io import BytesIO

from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.services.merchant_rules import find_matching_rule, merchant_key
from app.services.parsers import (
    NormalizedImportRow,
    ParsedRow,
    parse_bank_statement_text,
    normalize_parsed_row,
    parse_credit_card_statement_text,
    parse_upi_statement_text,
)

ParserFn = Callable[[str], list[ParsedRow]]


def extract_statement_text(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception:
        return file_bytes.decode("utf-8", errors="ignore")

    extracted_pages = [
        page_text.strip()
        for page in reader.pages
        if (page_text := (page.extract_text() or "").strip())
    ]
    if extracted_pages:
        return "\n".join(extracted_pages)

    return file_bytes.decode("utf-8", errors="ignore")


def is_duplicate_candidate(existing: Transaction, incoming: NormalizedImportRow) -> bool:
    existing_merchant_key = merchant_key(
        existing.raw_imported_merchant or existing.merchant
    )
    incoming_merchant_keys = {
        merchant_key(incoming.raw_merchant),
        merchant_key(incoming.merchant),
    }
    return (
        str(existing.amount) == incoming.amount
        and existing.transaction_date.isoformat() == incoming.transaction_date
        and existing_merchant_key in incoming_merchant_keys
    )


def find_duplicate_transaction(
    db: Session,
    *,
    incoming: NormalizedImportRow,
) -> Transaction | None:
    candidates = db.scalars(
        select(Transaction).where(
            Transaction.transaction_date == date.fromisoformat(incoming.transaction_date),
            Transaction.amount == Decimal(incoming.amount),
        )
    ).all()

    for existing in candidates:
        if is_duplicate_candidate(existing, incoming):
            return existing
    return None


def _select_parser(
    *,
    filename: str,
    source_type: str | None,
) -> tuple[str, str, ParserFn]:
    if source_type == "upi_pdf":
        return "upi_pdf", "upi", parse_upi_statement_text
    if source_type == "bank_statement_pdf":
        return "bank_statement_pdf", "bank_statement", parse_bank_statement_text
    if source_type == "credit_card_pdf":
        return "credit_card_pdf", "credit_card", parse_credit_card_statement_text

    normalized_filename = filename.lower()
    if "upi" in normalized_filename:
        return "upi_pdf", "upi", parse_upi_statement_text
    if "statement" in normalized_filename or "acctstatement" in normalized_filename:
        return "bank_statement_pdf", "bank_statement", parse_bank_statement_text
    return "credit_card_pdf", "credit_card", parse_credit_card_statement_text


def _detect_batch_month_key(rows: list[NormalizedImportRow]) -> tuple[str, list[str]]:
    warnings: list[str] = []
    if not rows:
        return date.today().strftime("%Y-%m"), warnings

    month_counts = Counter(row.month_key for row in rows)
    detected_month = max(month_counts.items(), key=lambda item: (item[1], item[0]))[0]

    if len(month_counts) > 1:
        warnings.append(
            f"Statement spans multiple months; batch grouped under {detected_month}."
        )

    return detected_month, warnings


def process_pdf_upload(
    *,
    db: Session,
    file_bytes: bytes,
    filename: str,
    source_type: str | None = None,
) -> tuple[dict[str, str | list[str]], list[NormalizedImportRow]]:
    warnings: list[str] = []
    effective_source_type, parser_type, parser = _select_parser(
        filename=filename,
        source_type=source_type,
    )
    raw_text = extract_statement_text(file_bytes)
    if not raw_text.strip():
        warnings.append("No extractable text found in uploaded statement.")
    parsed_rows = parser(raw_text)
    rows = [
        normalize_parsed_row(
            row=parsed_row,
            source_type=effective_source_type,
        )
        for parsed_row in parsed_rows
    ]

    for row in rows:
        rule = find_matching_rule(db, row.merchant)
        if rule is None:
            continue
        row.merchant = rule.canonical_merchant
        row.expense_category = rule.expense_category

    parse_status = "success" if rows else "parse_failed"
    if parse_status == "parse_failed":
        warnings.append("No transactions matched the selected parser.")
    month_key, month_warnings = _detect_batch_month_key(rows)
    warnings.extend(month_warnings)
    metadata: dict[str, str | list[str]] = {
        "month_key": month_key,
        "source_type": effective_source_type,
        "parser_type": parser_type,
        "parse_status": parse_status,
        "warnings": warnings,
    }
    return metadata, rows
