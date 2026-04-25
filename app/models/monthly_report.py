from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    month_key: Mapped[str] = mapped_column(String(7), unique=True, index=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    common_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    personal_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unresolved_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    summary_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
