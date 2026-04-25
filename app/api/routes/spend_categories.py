from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.merchant_rule import MerchantRule
from app.models.spend_category import SpendCategory
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.spend_category import (
    SpendCategoryCreate,
    SpendCategoryDeleteResponse,
    SpendCategoryResponse,
    SpendCategoryUpdate,
)

router = APIRouter(prefix="/spend-categories", tags=["spend-categories"])


@router.get("", response_model=list[SpendCategoryResponse])
def list_spend_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SpendCategory]:
    _ = current_user
    return list(db.scalars(select(SpendCategory).order_by(SpendCategory.name, SpendCategory.id)))


@router.post("", response_model=SpendCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_spend_category(
    payload: SpendCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpendCategory:
    _ = current_user
    spend_category = SpendCategory(name=payload.name)
    db.add(spend_category)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Spend category already exists",
        ) from exc
    db.refresh(spend_category)
    return spend_category


@router.patch("/{category_id}", response_model=SpendCategoryResponse)
def update_spend_category(
    category_id: int,
    payload: SpendCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpendCategory:
    _ = current_user
    spend_category = db.scalar(
        select(SpendCategory).where(SpendCategory.id == category_id)
    )
    if spend_category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spend category not found",
        )

    spend_category.name = payload.name
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Spend category already exists",
        ) from exc
    db.refresh(spend_category)
    return spend_category


@router.delete("/{category_id}", response_model=SpendCategoryDeleteResponse)
def delete_spend_category(
    category_id: int,
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpendCategoryDeleteResponse | JSONResponse:
    _ = current_user
    spend_category = db.scalar(
        select(SpendCategory).where(SpendCategory.id == category_id)
    )
    if spend_category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spend category not found",
        )

    linked_transactions = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.spend_category_id == category_id)
    )
    linked_transactions = int(linked_transactions or 0)

    if linked_transactions > 0 and not confirm:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": (
                    f"Deleting this category will move {linked_transactions} "
                    "transactions to review"
                ),
                "linked_transactions": linked_transactions,
            },
        )

    if linked_transactions > 0:
        for transaction in db.scalars(
            select(Transaction).where(Transaction.spend_category_id == category_id)
        ):
            transaction.spend_category_id = None
            transaction.review_status = "needs_review"

    for merchant_rule in db.scalars(
        select(MerchantRule).where(MerchantRule.spend_category_id == category_id)
    ):
        merchant_rule.spend_category_id = None

    db.delete(spend_category)
    db.commit()
    return SpendCategoryDeleteResponse(
        deleted_id=category_id,
        moved_to_review_count=linked_transactions,
    )
