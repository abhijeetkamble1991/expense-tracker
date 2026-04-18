from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/months", tags=["months"])


@router.get("", response_model=list[str])
def list_months(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[str]:
    _ = current_user
    return list(
        db.scalars(
            select(Transaction.month_key)
            .distinct()
            .order_by(Transaction.month_key.desc())
        )
    )
