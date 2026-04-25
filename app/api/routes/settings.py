from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.app_settings import AppSettings
from app.models.user import User
from app.schemas.settings import (
    PasswordChangeRequest,
    PasswordChangeResponse,
    SettingsResponse,
    SettingsUpdate,
)

router = APIRouter(prefix="/settings", tags=["settings"])


def get_or_create_settings(db: Session) -> AppSettings:
    settings = db.scalar(select(AppSettings).where(AppSettings.id == 1))
    if settings is None:
        settings = AppSettings(id=1, currency_code="USD")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SettingsResponse)
def read_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsResponse:
    settings = get_or_create_settings(db)
    return SettingsResponse(
        username=current_user.username,
        display_name=current_user.display_name,
        created_at=current_user.created_at,
        currency_code=settings.currency_code,
    )


@router.patch("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsResponse:
    settings = get_or_create_settings(db)
    current_user.display_name = payload.display_name
    settings.currency_code = payload.currency_code
    db.commit()
    db.refresh(settings)
    db.refresh(current_user)
    return SettingsResponse(
        username=current_user.username,
        display_name=current_user.display_name,
        created_at=current_user.created_at,
        currency_code=settings.currency_code,
    )


@router.patch("/password", response_model=PasswordChangeResponse)
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PasswordChangeResponse:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return PasswordChangeResponse(detail="Password updated")
