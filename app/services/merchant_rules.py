from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.merchant_rule import MerchantRule


def merchant_key(value: str) -> str:
    return " ".join(value.strip().lower().split())


def find_matching_rule(db: Session, merchant: str) -> MerchantRule | None:
    key = merchant_key(merchant)
    if not key:
        return None

    rule = db.scalar(select(MerchantRule).where(MerchantRule.merchant_key == key))
    if rule is not None:
        return rule

    return db.scalar(
        select(MerchantRule).where(MerchantRule.canonical_merchant == merchant.strip())
    )


def upsert_merchant_rule(
    db: Session,
    *,
    raw_merchant: str,
    canonical_merchant: str,
    expense_category: str,
    spend_category_id: int | None,
) -> MerchantRule | None:
    key = merchant_key(raw_merchant)
    if not key:
        return None

    rule = db.scalar(select(MerchantRule).where(MerchantRule.merchant_key == key))
    if rule is None:
        rule = MerchantRule(
            merchant_key=key,
            canonical_merchant=canonical_merchant.strip(),
            expense_category=expense_category,
            spend_category_id=spend_category_id,
        )
        db.add(rule)
        return rule

    rule.canonical_merchant = canonical_merchant.strip()
    rule.expense_category = expense_category
    rule.spend_category_id = spend_category_id
    return rule
