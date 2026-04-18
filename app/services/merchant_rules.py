from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.merchant_rule import MerchantRule


def merchant_key(value: str) -> str:
    return " ".join(value.strip().lower().split())


def find_matching_rule(db: Session, merchant: str) -> MerchantRule | None:
    key = merchant_key(merchant)
    if not key:
        return None
    return db.scalar(select(MerchantRule).where(MerchantRule.merchant_key == key))


def upsert_merchant_rule(
    db: Session,
    *,
    merchant: str,
    expense_category: str,
    spend_category_id: int | None,
) -> MerchantRule | None:
    key = merchant_key(merchant)
    if not key:
        return None

    rule = db.scalar(select(MerchantRule).where(MerchantRule.merchant_key == key))
    if rule is None:
        rule = MerchantRule(
            merchant_key=key,
            canonical_merchant=merchant.strip(),
            expense_category=expense_category,
            spend_category_id=spend_category_id,
        )
        db.add(rule)
        return rule

    rule.canonical_merchant = merchant.strip()
    rule.expense_category = expense_category
    rule.spend_category_id = spend_category_id
    return rule

