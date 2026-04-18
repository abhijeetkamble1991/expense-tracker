from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.spend_category import SpendCategory
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import ManualTransactionCreate, TransactionResponse
from app.services.merchant_rules import upsert_merchant_rule

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionReviewUpdate(BaseModel):
    merchant: str | None = None
    expense_category: Literal["common", "personal"] | None = None
    spend_category_id: int | None = None
    review_status: Literal["needs_review", "reviewed", "flagged"] | None = None

    @field_validator("merchant")
    @classmethod
    def validate_merchant(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Value cannot be blank")
        return trimmed


@router.post(
    "/manual",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_manual_transaction(
    payload: ManualTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    _ = current_user
    spend_category = db.scalar(
        select(SpendCategory).where(SpendCategory.id == payload.spend_category_id)
    )
    if spend_category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spend category not found",
        )

    transaction = Transaction(
        **payload.model_dump(),
        source_type="manual",
        review_status="reviewed",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction_review(
    transaction_id: int,
    payload: TransactionReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    _ = current_user
    transaction = db.scalar(select(Transaction).where(Transaction.id == transaction_id))
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    original_merchant = transaction.merchant
    updates = payload.model_dump(exclude_unset=True)
    if "spend_category_id" in updates:
        spend_category = db.scalar(
            select(SpendCategory).where(SpendCategory.id == updates["spend_category_id"])
        )
        if spend_category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Spend category not found",
            )

    for field_name, value in updates.items():
        setattr(transaction, field_name, value)

    if (
        transaction.review_status == "reviewed"
        and {
        "merchant",
        "expense_category",
        "spend_category_id",
        "review_status",
    } & updates.keys()
    ):
        upsert_merchant_rule(
            db,
            raw_merchant=original_merchant,
            canonical_merchant=transaction.merchant,
            expense_category=transaction.expense_category,
            spend_category_id=transaction.spend_category_id,
        )

    db.commit()
    db.refresh(transaction)
    return transaction
