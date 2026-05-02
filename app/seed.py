from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, is_password_hash_supported
from app.models.spend_category import SpendCategory
from app.models.user import User

DEFAULT_SPEND_CATEGORIES = (
    "Bills",
    "Commute",
    "Healthcare",
    "Household",
    "Leisure",
    "Subscriptions",
)


def ensure_bootstrap_user(db: Session) -> None:
    existing_user = db.scalar(
        select(User).where(User.username == settings.bootstrap_username)
    )
    if existing_user is not None:
        if not is_password_hash_supported(existing_user.password_hash):
            existing_user.password_hash = hash_password(settings.bootstrap_password)
            db.commit()
        return

    db.add(
        User(
            username=settings.bootstrap_username,
            display_name=settings.bootstrap_username.title(),
            password_hash=hash_password(settings.bootstrap_password),
        )
    )
    db.commit()


def ensure_default_spend_categories(db: Session) -> None:
    existing_count = db.scalar(select(SpendCategory.id).limit(1))
    if existing_count is not None:
        return

    db.add_all(SpendCategory(name=name) for name in DEFAULT_SPEND_CATEGORIES)
    db.commit()
