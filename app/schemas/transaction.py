from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


class ManualTransactionCreate(BaseModel):
    transaction_date: date
    amount: Decimal
    description: str
    merchant: str
    month_key: str
    expense_category: Literal["common", "personal"]
    spend_category_id: int
    notes: str | None = None

    @field_validator("description", "merchant")
    @classmethod
    def validate_text_fields(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Value cannot be blank")
        return trimmed

    @field_validator("month_key")
    @classmethod
    def validate_month_key(cls, value: str) -> str:
        trimmed = value.strip()
        parts = trimmed.split("-")
        if (
            len(parts) != 2
            or len(parts[0]) != 4
            or len(parts[1]) != 2
            or not parts[0].isdigit()
            or not parts[1].isdigit()
        ):
            raise ValueError("month_key must match YYYY-MM")
        month = int(parts[1])
        if month < 1 or month > 12:
            raise ValueError("month_key must match YYYY-MM")
        return trimmed

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


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
