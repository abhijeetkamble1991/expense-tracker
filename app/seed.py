from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def ensure_bootstrap_user(db: Session) -> None:
    if db.scalar(select(User).where(User.username == settings.bootstrap_username)):
        return

    db.add(
        User(
            username=settings.bootstrap_username,
            display_name=settings.bootstrap_username.title(),
            password_hash=hash_password(settings.bootstrap_password),
        )
    )
    db.commit()
