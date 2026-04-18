from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import ManualTransactionCreate, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


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
    transaction = Transaction(
        **payload.model_dump(),
        source_type="manual",
        review_status="reviewed",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction
