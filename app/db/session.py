from collections.abc import Generator
from functools import lru_cache
from ssl import CERT_NONE, create_default_context
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.base import Base


def _create_engine():
    connect_args = {}
    database_url = settings.database_url

    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif database_url.startswith("postgresql+pg8000://"):
        parsed_url = urlsplit(database_url)
        filtered_query = []
        sslmode = None

        for key, value in parse_qsl(parsed_url.query, keep_blank_values=True):
            if key == "sslmode":
                sslmode = value
            else:
                filtered_query.append((key, value))

        if sslmode in {"require", "prefer"}:
            ssl_context = create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = CERT_NONE
            connect_args["ssl_context"] = ssl_context
        elif sslmode == "verify-ca":
            ssl_context = create_default_context()
            ssl_context.check_hostname = False
            connect_args["ssl_context"] = ssl_context
        elif sslmode == "verify-full":
            connect_args["ssl_context"] = create_default_context()

        if sslmode is not None:
            database_url = urlunsplit(
                (
                    parsed_url.scheme,
                    parsed_url.netloc,
                    parsed_url.path,
                    urlencode(filtered_query),
                    parsed_url.fragment,
                )
            )

    if settings.worker_runtime:
        return create_engine(
            database_url,
            connect_args=connect_args,
            poolclass=NullPool,
        )
    return create_engine(database_url, connect_args=connect_args)


@lru_cache
def _get_cached_engine():
    return _create_engine()


def reset_engine() -> None:
    _get_cached_engine.cache_clear()


def get_engine():
    if settings.worker_runtime:
        return _create_engine()
    return _get_cached_engine()


get_engine.cache_clear = reset_engine


def get_db() -> Generator[Session, None, None]:
    engine = get_engine()
    with Session(engine) as db:
        yield db
    if settings.worker_runtime:
        engine.dispose()


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
    from app.seed import ensure_bootstrap_user, ensure_default_spend_categories

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    run_schema_migrations(engine)
    with Session(engine) as db:
        ensure_bootstrap_user(db)
        ensure_default_spend_categories(db)
