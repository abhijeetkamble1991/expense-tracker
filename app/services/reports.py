from collections import defaultdict
from decimal import Decimal

from app.models.transaction import Transaction


def _format_decimal_map(values: dict[str, Decimal]) -> dict[str, str]:
    return {key: f"{value:.2f}" for key, value in values.items()}


def build_month_report(transactions: list[Transaction]) -> dict[str, dict[str, str]]:
    totals = {
        "overall": Decimal("0.00"),
        "common": Decimal("0.00"),
        "personal": Decimal("0.00"),
    }
    by_spend_category: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    by_merchant: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    by_source: defaultdict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))

    for transaction in transactions:
        totals["overall"] += transaction.amount
        totals[transaction.expense_category] += transaction.amount
        by_source[transaction.source_type] += transaction.amount
        by_merchant[transaction.merchant] += transaction.amount
        if transaction.spend_category_id is not None:
            by_spend_category[str(transaction.spend_category_id)] += transaction.amount

    return {
        "totals": _format_decimal_map(totals),
        "by_source": _format_decimal_map(dict(by_source)),
        "by_merchant": _format_decimal_map(dict(by_merchant)),
        "by_spend_category": _format_decimal_map(dict(by_spend_category)),
    }
