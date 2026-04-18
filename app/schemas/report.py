from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.transaction import TransactionResponse


class MonthlyReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    month_key: str
    totals: dict[str, str]
    by_source: dict[str, str]
    by_merchant: dict[str, str]
    by_spend_category: dict[str, str]
    transactions: list[TransactionResponse]


class StoredMonthlyReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    month_key: str
    total_amount: Decimal
    common_amount: Decimal
    personal_amount: Decimal
    unresolved_count: int
    summary_json: str
    generated_at: datetime
