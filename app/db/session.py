from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, inspect, text
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


def _migrate_sqlite_schema(engine) -> None:
    inspector = inspect(engine)

    if not inspector.has_table("users"):
        user_columns = set()
    else:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "display_name" not in user_columns and user_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN display_name VARCHAR(120) NOT NULL DEFAULT 'Owner'"
                )
            )

    if not inspector.has_table("transactions"):
        return

    transaction_columns = {
        column["name"] for column in inspector.get_columns("transactions")
    }
    if "transaction_time" not in transaction_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE transactions "
                    "ADD COLUMN transaction_time VARCHAR(10)"
                )
            )
    if "reimburse" not in transaction_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE transactions "
                    "ADD COLUMN reimburse BOOLEAN NOT NULL DEFAULT 0"
                )
            )


def run_schema_migrations(engine) -> None:
    if settings.database_url.startswith("sqlite"):
        _migrate_sqlite_schema(engine)


def init_db() -> None:
    import app.models  # noqa: F401
    from app.seed import ensure_bootstrap_user

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    run_schema_migrations(engine)
    with Session(engine) as db:
        ensure_bootstrap_user(db)
