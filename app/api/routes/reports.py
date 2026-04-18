from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.spend_category import SpendCategory
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

    spend_category_ids = {
        transaction.spend_category_id
        for transaction in transactions
        if transaction.spend_category_id is not None
    }
    spend_category_names_by_id = {}
    if spend_category_ids:
        spend_category_names_by_id = {
            spend_category.id: spend_category.name
            for spend_category in db.scalars(
                select(SpendCategory).where(SpendCategory.id.in_(spend_category_ids))
            )
        }

    summary = build_month_report(
        transactions,
        spend_category_names_by_id=spend_category_names_by_id,
    )
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
