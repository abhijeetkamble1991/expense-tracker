from collections.abc import Mapping
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+pg8000://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+pg8000://", 1)
    if database_url.startswith("postgresql+psycopg://"):
        return database_url.replace(
            "postgresql+psycopg://", "postgresql+pg8000://", 1
        )
    if database_url.startswith("postgresql+psycopg2://"):
        return database_url.replace(
            "postgresql+psycopg2://", "postgresql+pg8000://", 1
        )
    return database_url


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str
    access_token_minutes: int
    bootstrap_username: str
    bootstrap_password: str
    worker_runtime: bool = False
    hyperdrive_binding: str

    model_config = SettingsConfigDict(
        env_prefix="EXPENSE_TRACKER_",
        env_file=(".env.example", ".env"),
        validate_assignment=True,
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        return normalize_database_url(value)


settings = Settings()


def configure_runtime_settings(**overrides: Any) -> None:
    changed_db_settings = False

    for key, value in overrides.items():
        if value is None or not hasattr(settings, key):
            continue

        previous_value = getattr(settings, key)
        setattr(settings, key, value)

        if key in {"database_url", "worker_runtime"} and previous_value != getattr(
            settings, key
        ):
            changed_db_settings = True

    if changed_db_settings:
        from app.db.session import reset_engine

        reset_engine()


def _get_env_value(env: object, name: str) -> Any:
    if isinstance(env, Mapping):
        return env.get(name)
    return getattr(env, name, None)


def apply_cloudflare_runtime_env(env: object) -> None:
    hyperdrive = _get_env_value(env, settings.hyperdrive_binding)
    database_url = None

    if hyperdrive is not None:
        database_url = getattr(hyperdrive, "connectionString", None)

    configure_runtime_settings(
        database_url=database_url
        or _get_env_value(env, "EXPENSE_TRACKER_DATABASE_URL"),
        jwt_secret=_get_env_value(env, "EXPENSE_TRACKER_JWT_SECRET"),
        jwt_algorithm=_get_env_value(env, "EXPENSE_TRACKER_JWT_ALGORITHM"),
        access_token_minutes=_get_env_value(env, "EXPENSE_TRACKER_ACCESS_TOKEN_MINUTES"),
        bootstrap_username=_get_env_value(env, "EXPENSE_TRACKER_BOOTSTRAP_USERNAME"),
        bootstrap_password=_get_env_value(env, "EXPENSE_TRACKER_BOOTSTRAP_PASSWORD"),
        worker_runtime=True,
    )
