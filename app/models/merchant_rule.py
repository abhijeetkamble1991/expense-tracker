from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MerchantRule(Base):
    __tablename__ = "merchant_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    merchant_key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    canonical_merchant: Mapped[str] = mapped_column(String(200), nullable=False)
    expense_category: Mapped[str] = mapped_column(String(20), nullable=False)
    spend_category_id: Mapped[int | None] = mapped_column(ForeignKey("spend_categories.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

