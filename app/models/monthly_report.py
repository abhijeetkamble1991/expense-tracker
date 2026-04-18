from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    month_key: Mapped[str] = mapped_column(String(7), unique=True, index=True)
    totals_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    by_source_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    by_merchant_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    by_spend_category_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
