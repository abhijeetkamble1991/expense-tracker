from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.spend_category import SpendCategory
from app.models.user import User
from app.schemas.spend_category import SpendCategoryCreate, SpendCategoryResponse

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
