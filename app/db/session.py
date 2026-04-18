from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import Base


@lru_cache
def get_engine():
    connect_args = {}
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(settings.database_url, connect_args=connect_args)


def get_db() -> Generator[Session, None, None]:
    with Session(get_engine()) as db:
        yield db


def init_db() -> None:
    import app.models  # noqa: F401
    from app.seed import ensure_bootstrap_user

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        ensure_bootstrap_user(db)
