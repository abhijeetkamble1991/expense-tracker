from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.spend_category import SpendCategory
from app.models.user import User
from app.schemas.spend_category import SpendCategoryCreate, SpendCategoryResponse

router = APIRouter(prefix="/spend-categories", tags=["spend-categories"])


@router.post("", response_model=SpendCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_spend_category(
    payload: SpendCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpendCategory:
    spend_category = SpendCategory(user_id=current_user.id, name=payload.name)
    db.add(spend_category)
    db.commit()
    db.refresh(spend_category)
    return spend_category
