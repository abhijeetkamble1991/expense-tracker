from datetime import datetime

from pydantic import BaseModel, field_validator


class SettingsResponse(BaseModel):
    username: str
    display_name: str
    created_at: datetime
    currency_code: str


class SettingsUpdate(BaseModel):
    display_name: str
    currency_code: str

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("display_name cannot be blank")
        return trimmed

    @field_validator("currency_code")
    @classmethod
    def validate_currency_code(cls, value: str) -> str:
        normalized = value.strip().upper()
        if len(normalized) != 3 or not normalized.isalpha():
            raise ValueError("currency_code must match ISO 4217 format")
        return normalized


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("current_password", "new_password")
    @classmethod
    def validate_passwords(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Password cannot be blank")
        return trimmed

    @field_validator("new_password")
    @classmethod
    def validate_new_password_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("new_password must be at least 8 characters")
        return value


class PasswordChangeResponse(BaseModel):
    detail: str
