from collections.abc import Mapping
from typing import Any

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.database_url_crypto import resolve_database_url


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
    database_url: str = "sqlite:///./expense_tracker.db"
    database_url_encrypted: str | None = None
    database_url_key: str | None = None
    jwt_secret: str = "expense-tracker-dev-jwt-secret"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    bootstrap_username: str = "abhijeet"
    bootstrap_password: str = "Abhijeet123#"
    worker_runtime: bool = False
    hyperdrive_binding: str = "HYPERDRIVE"

    model_config = SettingsConfigDict(
        env_prefix="EXPENSE_TRACKER_",
        env_file=(".env.example", ".env"),
        validate_assignment=True,
    )

    @model_validator(mode="after")
    def _resolve_database_url(self) -> "Settings":
        resolved_url = resolve_database_url(
            self.database_url,
            self.database_url_encrypted,
            self.database_url_key,
        )
        object.__setattr__(
            self,
            "database_url",
            normalize_database_url(resolved_url or self.database_url),
        )
        return self


settings = Settings()


def configure_runtime_settings(**overrides: Any) -> None:
    current_values = settings.model_dump()
    updated_values = dict(current_values)

    for key, value in overrides.items():
        if value is None or key not in type(settings).model_fields:
            continue
        updated_values[key] = value

    validated_settings = Settings.model_validate(updated_values)
    validated_values = validated_settings.model_dump()
    changed_db_settings = any(
        current_values.get(key) != validated_values.get(key)
        for key in {
            "database_url",
            "database_url_encrypted",
            "database_url_key",
            "worker_runtime",
        }
    )

    for key, value in validated_values.items():
        object.__setattr__(settings, key, value)

    if changed_db_settings:
        from app.db.session import reset_engine

        reset_engine()


def _get_env_value(env: object, name: str) -> Any:
    if isinstance(env, Mapping):
        return env.get(name)
    return getattr(env, name, None)


def apply_cloudflare_runtime_env(env: object) -> None:
    binding_name = (
        _get_env_value(env, "EXPENSE_TRACKER_HYPERDRIVE_BINDING")
        or settings.hyperdrive_binding
    )
    hyperdrive = _get_env_value(env, binding_name)
    database_url = None

    if hyperdrive is not None:
        database_url = getattr(hyperdrive, "connectionString", None)

    configure_runtime_settings(
        hyperdrive_binding=binding_name,
        database_url=database_url
        or _get_env_value(env, "EXPENSE_TRACKER_DATABASE_URL"),
        database_url_encrypted=_get_env_value(
            env, "EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED"
        ),
        database_url_key=_get_env_value(env, "EXPENSE_TRACKER_DATABASE_URL_KEY"),
        jwt_secret=_get_env_value(env, "EXPENSE_TRACKER_JWT_SECRET"),
        jwt_algorithm=_get_env_value(env, "EXPENSE_TRACKER_JWT_ALGORITHM"),
        access_token_minutes=_get_env_value(env, "EXPENSE_TRACKER_ACCESS_TOKEN_MINUTES"),
        bootstrap_username=_get_env_value(env, "EXPENSE_TRACKER_BOOTSTRAP_USERNAME"),
        bootstrap_password=_get_env_value(env, "EXPENSE_TRACKER_BOOTSTRAP_PASSWORD"),
        worker_runtime=True,
    )
