from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ManualTransactionCreate(BaseModel):
    transaction_date: date
    amount: Decimal
    description: str
    merchant: str
    month_key: str
    expense_category: Literal["common", "personal"]
    spend_category_id: int
    notes: str | None = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_date: date
    amount: Decimal
    description: str
    merchant: str
    month_key: str
    expense_category: Literal["common", "personal"]
    spend_category_id: int
    source_type: str
    review_status: str
    notes: str | None
