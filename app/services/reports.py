import json
import re
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.models.monthly_report import MonthlyReport
from app.models.transaction import Transaction

MONTH_KEY_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _format_decimal_map(values: dict[str, Decimal]) -> dict[str, str]:
    return {key: f"{value:.2f}" for key, value in values.items()}


def is_valid_month_key(month_key: str) -> bool:
    return bool(MONTH_KEY_PATTERN.fullmatch(month_key))


def build_month_report(
    transactions: list[Transaction],
    *,
    spend_category_names_by_id: dict[int, str] | None = None,
) -> dict[str, dict[str, str]]:
    totals = {
        "overall": Decimal("0.00"),
        "common": Decimal("0.00"),
        "personal": Decimal("0.00"),
    }
    spend_category_names_by_id = spend_category_names_by_id or {}
    by_spend_category: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    by_merchant: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    by_source: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))

    for transaction in transactions:
        totals["overall"] += transaction.amount
        totals[transaction.expense_category] += transaction.amount
        by_source[transaction.source_type] += transaction.amount
        by_merchant[transaction.merchant] += transaction.amount
        if transaction.spend_category_id is not None:
            spend_category_name = spend_category_names_by_id.get(
                transaction.spend_category_id,
                str(transaction.spend_category_id),
            )
            by_spend_category[spend_category_name] += transaction.amount

    return {
        "totals": _format_decimal_map(totals),
        "by_source": _format_decimal_map(dict(by_source)),
        "by_merchant": _format_decimal_map(dict(by_merchant)),
        "by_spend_category": _format_decimal_map(dict(by_spend_category)),
    }


def ensure_monthly_report_compatibility(db: Session) -> None:
    engine = db.get_bind()
    inspector = inspect(engine)

    if "monthly_reports" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("monthly_reports")
    }
    alter_statements: list[str] = []

    if "total_amount" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE monthly_reports ADD COLUMN total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0"
        )
    if "common_amount" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE monthly_reports ADD COLUMN common_amount NUMERIC(12, 2) NOT NULL DEFAULT 0"
        )
    if "personal_amount" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE monthly_reports ADD COLUMN personal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0"
        )
    if "unresolved_count" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE monthly_reports ADD COLUMN unresolved_count INTEGER NOT NULL DEFAULT 0"
        )
    if "summary_json" not in existing_columns:
        alter_statements.append(
            "ALTER TABLE monthly_reports ADD COLUMN summary_json TEXT NOT NULL DEFAULT '{}'"
        )

    for statement in alter_statements:
        db.execute(text(statement))

    if alter_statements:
        db.commit()


def upsert_monthly_report_snapshot(
    db: Session,
    *,
    month_key: str,
    transactions: list[Transaction],
    summary: dict[str, dict[str, str]],
) -> MonthlyReport:
    ensure_monthly_report_compatibility(db)

    unresolved_count = sum(
        1 for transaction in transactions if transaction.review_status != "reviewed"
    )
    monthly_report = db.scalar(
        select(MonthlyReport).where(MonthlyReport.month_key == month_key)
    )

    if monthly_report is None:
        monthly_report = MonthlyReport(month_key=month_key)
        db.add(monthly_report)

    monthly_report.total_amount = Decimal(summary["totals"]["overall"])
    monthly_report.common_amount = Decimal(summary["totals"]["common"])
    monthly_report.personal_amount = Decimal(summary["totals"]["personal"])
    monthly_report.unresolved_count = unresolved_count
    monthly_report.summary_json = json.dumps(summary, sort_keys=True)

    db.commit()
    db.refresh(monthly_report)
    return monthly_report
