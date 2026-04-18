from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    spend_category_id: Mapped[int] = mapped_column(
        ForeignKey("spend_categories.id"),
        index=True,
    )
    transaction_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(String(255))
    merchant: Mapped[str] = mapped_column(String(255))
    month_key: Mapped[str] = mapped_column(String(7))
    expense_category: Mapped[str] = mapped_column(String(20))
    source_type: Mapped[str] = mapped_column(
        String(20),
        default="manual",
        server_default="manual",
    )
    review_status: Mapped[str] = mapped_column(
        String(20),
        default="reviewed",
        server_default="reviewed",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
