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
from app.schemas.transaction import (
    ManualTransactionCreate,
    TransactionDeleteResponse,
    TransactionResponse,
)
from app.services.merchant_rules import upsert_merchant_rule

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionReviewUpdate(BaseModel):
    merchant: str | None = None
    expense_category: Literal["common", "personal"] | None = None
    spend_category_id: int | None = None
    reimburse: bool | None = None
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


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    month_key: str | None = None,
    review_status: Literal["needs_review", "reviewed", "flagged"] | None = None,
    source_type: str | None = None,
    expense_category: Literal["common", "personal"] | None = None,
    spend_category_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Transaction]:
    _ = current_user
    query = select(Transaction)

    if month_key is not None:
        query = query.where(Transaction.month_key == month_key)
    if review_status is not None:
        query = query.where(Transaction.review_status == review_status)
    if source_type is not None:
        query = query.where(Transaction.source_type == source_type)
    if expense_category is not None:
        query = query.where(Transaction.expense_category == expense_category)
    if spend_category_id is not None:
        query = query.where(Transaction.spend_category_id == spend_category_id)

    return list(
        db.scalars(
            query.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        )
    )


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

    raw_merchant_for_rule = transaction.raw_imported_merchant or transaction.merchant
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

    if transaction.expense_category != "common":
        transaction.reimburse = False
    elif updates.get("reimburse") and transaction.expense_category != "common":
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Reimburse can only be enabled for common expenses",
        )

    if transaction.review_status == "reviewed" and transaction.spend_category_id is None:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Reviewed transactions require a spend category",
        )

    if transaction.reimburse and transaction.expense_category != "common":
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Reimburse can only be enabled for common expenses",
        )

    if (
        transaction.review_status == "reviewed"
        and transaction.spend_category_id is not None
        and {
        "merchant",
        "expense_category",
        "spend_category_id",
        "reimburse",
        "review_status",
    } & updates.keys()
    ):
        upsert_merchant_rule(
            db,
            raw_merchant=raw_merchant_for_rule,
            canonical_merchant=transaction.merchant,
            expense_category=transaction.expense_category,
            spend_category_id=transaction.spend_category_id,
        )

    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", response_model=TransactionDeleteResponse)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionDeleteResponse:
    _ = current_user
    transaction = db.scalar(select(Transaction).where(Transaction.id == transaction_id))
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    db.delete(transaction)
    db.commit()
    return TransactionDeleteResponse(deleted_id=transaction_id)
