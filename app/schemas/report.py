from datetime import datetime

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
    totals_json: str
    by_source_json: str
    by_merchant_json: str
    by_spend_category_json: str
    generated_at: datetime
