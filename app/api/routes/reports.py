from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.report import MonthlyReportResponse
from app.services.reports import (
    build_month_report,
    is_valid_month_key,
    upsert_monthly_report_snapshot,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/{month_key}/regenerate", response_model=MonthlyReportResponse)
def regenerate_report(
    month_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MonthlyReportResponse:
    _ = current_user
    if not is_valid_month_key(month_key):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="month_key must match YYYY-MM",
        )

    transactions = list(
        db.scalars(
            select(Transaction)
            .where(Transaction.month_key == month_key)
            .order_by(Transaction.transaction_date, Transaction.id)
        )
    )
    if not transactions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transactions found for month",
        )

    summary = build_month_report(transactions)
    upsert_monthly_report_snapshot(
        db,
        month_key=month_key,
        transactions=transactions,
        summary=summary,
    )
    return MonthlyReportResponse(
        month_key=month_key,
        transactions=transactions,
        **summary,
    )
