from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    posted_date: Mapped[date | None] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    merchant: Mapped[str] = mapped_column(String(200), nullable=False)
    month_key: Mapped[str] = mapped_column(String(7), index=True)
    source_type: Mapped[str] = mapped_column(
        String(30),
        default="manual",
        server_default="manual",
        nullable=False,
    )
    expense_category: Mapped[str] = mapped_column(String(20), nullable=False)
    spend_category_id: Mapped[int | None] = mapped_column(ForeignKey("spend_categories.id"))
    import_batch_id: Mapped[int | None] = mapped_column(ForeignKey("import_batches.id"))
    review_status: Mapped[str] = mapped_column(
        String(20),
        default="reviewed",
        server_default="reviewed",
        nullable=False,
    )
    duplicate_suspected: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    duplicate_reason: Mapped[str | None] = mapped_column(Text)
    source_reference: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
