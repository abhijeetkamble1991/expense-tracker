from types import SimpleNamespace
import importlib
import shutil
import ssl
import sys
from pathlib import Path

from fastapi.testclient import TestClient


def test_settings_can_boot_without_env_files_for_workers() -> None:
    from app.core.config import Settings

    settings = Settings(_env_file=None)

    assert settings.database_url == "sqlite:///./expense_tracker.db"
    assert settings.jwt_secret == "expense-tracker-dev-jwt-secret"
    assert settings.jwt_algorithm == "HS256"
    assert settings.access_token_minutes == 60
    assert settings.bootstrap_username == "abhijeet"
    assert settings.bootstrap_password == "Abhijeet123#"
    assert settings.hyperdrive_binding == "HYPERDRIVE"


def test_flattened_worker_bundle_can_import_app_package(tmp_path, monkeypatch) -> None:
    source_dir = Path("app")

    for child in source_dir.iterdir():
        destination = tmp_path / child.name
        if child.is_dir():
            shutil.copytree(child, destination)
        else:
            shutil.copy2(child, destination)

    monkeypatch.syspath_prepend(str(tmp_path))

    for module_name in ("worker", "main", "app"):
        sys.modules.pop(module_name, None)

    worker_module = importlib.import_module("worker")

    assert worker_module.app.title == "Expense Tracker API"


def test_create_app_can_skip_db_init(monkeypatch) -> None:
    from app import main as app_main

    init_calls = {"count": 0}

    def fake_init_db() -> None:
        init_calls["count"] += 1

    monkeypatch.setattr(app_main, "init_db", fake_init_db)

    with TestClient(app_main.create_app(auto_init_db=False)) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert init_calls["count"] == 0


def test_cloudflare_runtime_env_can_override_settings(monkeypatch) -> None:
    from app.core.config import apply_cloudflare_runtime_env, settings
    from app.db.session import get_engine

    original_values = {
        "database_url": settings.database_url,
        "database_url_encrypted": getattr(settings, "database_url_encrypted", None),
        "database_url_key": getattr(settings, "database_url_key", None),
        "jwt_secret": settings.jwt_secret,
        "worker_runtime": settings.worker_runtime,
    }
    object.__setattr__(settings, "database_url", "sqlite:///./expense_tracker.db")
    object.__setattr__(settings, "database_url_encrypted", None)
    object.__setattr__(settings, "database_url_key", None)
    object.__setattr__(settings, "jwt_secret", "change-me")
    object.__setattr__(settings, "worker_runtime", False)
    get_engine.cache_clear()

    try:
        env = SimpleNamespace(
            HYPERDRIVE=SimpleNamespace(
                connectionString="postgres://worker:secret@example.com:5432/expense_tracker"
            ),
            EXPENSE_TRACKER_JWT_SECRET="workers-secret",
        )

        apply_cloudflare_runtime_env(env)

        assert settings.worker_runtime is True
        assert (
            settings.database_url
            == "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
        )
        assert settings.jwt_secret == "workers-secret"
    finally:
        for key, value in original_values.items():
            object.__setattr__(settings, key, value)
        get_engine.cache_clear()


def test_cloudflare_runtime_env_can_decrypt_database_url(monkeypatch) -> None:
    from app.core.config import apply_cloudflare_runtime_env, settings
    from app.core.database_url_crypto import encrypt_database_url
    from app.db.session import get_engine

    original_values = {
        "database_url": settings.database_url,
        "database_url_encrypted": getattr(settings, "database_url_encrypted", None),
        "database_url_key": getattr(settings, "database_url_key", None),
        "jwt_secret": settings.jwt_secret,
        "worker_runtime": settings.worker_runtime,
    }

    object.__setattr__(settings, "database_url", "sqlite:///./expense_tracker.db")
    object.__setattr__(settings, "database_url_encrypted", None)
    object.__setattr__(settings, "database_url_key", None)
    object.__setattr__(settings, "jwt_secret", "change-me")
    object.__setattr__(settings, "worker_runtime", False)
    get_engine.cache_clear()

    try:
        env = SimpleNamespace(
            EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED=encrypt_database_url(
                "postgres://worker:secret@example.com:5432/expense_tracker",
                "workers-db-key",
            ),
            EXPENSE_TRACKER_DATABASE_URL_KEY="workers-db-key",
            EXPENSE_TRACKER_JWT_SECRET="workers-secret",
        )

        apply_cloudflare_runtime_env(env)

        assert settings.worker_runtime is True
        assert (
            settings.database_url
            == "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
        )
        assert settings.jwt_secret == "workers-secret"
    finally:
        for key, value in original_values.items():
            object.__setattr__(settings, key, value)
        get_engine.cache_clear()


def test_pg8000_engine_translates_sslmode_require(monkeypatch) -> None:
    from app.core.config import settings
    from app.db import session as session_module

    captured = {}

    def fake_create_engine(database_url, **kwargs):
        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(dispose=lambda: None)

    original_values = {
        "database_url": settings.database_url,
        "database_url_encrypted": getattr(settings, "database_url_encrypted", None),
        "database_url_key": getattr(settings, "database_url_key", None),
        "worker_runtime": settings.worker_runtime,
    }
    object.__setattr__(
        settings,
        "database_url",
        "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker?sslmode=require",
    )
    object.__setattr__(settings, "database_url_encrypted", None)
    object.__setattr__(settings, "database_url_key", None)
    object.__setattr__(settings, "worker_runtime", False)
    monkeypatch.setattr(session_module, "create_engine", fake_create_engine)
    session_module.get_engine.cache_clear()

    try:
        session_module.get_engine()

        assert captured["database_url"] == (
            "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
        )
        assert "ssl_context" in captured["kwargs"]["connect_args"]
        assert (
            captured["kwargs"]["connect_args"]["ssl_context"].verify_mode
            == ssl.CERT_NONE
        )
        assert captured["kwargs"]["connect_args"]["ssl_context"].check_hostname is False
    finally:
        for key, value in original_values.items():
            object.__setattr__(settings, key, value)
        session_module.get_engine.cache_clear()


def test_pg8000_engine_translates_sslmode_verify_ca(monkeypatch) -> None:
    from app.core.config import settings
    from app.db import session as session_module

    captured = {}

    def fake_create_engine(database_url, **kwargs):
        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(dispose=lambda: None)

    original_values = {
        "database_url": settings.database_url,
        "database_url_encrypted": getattr(settings, "database_url_encrypted", None),
        "database_url_key": getattr(settings, "database_url_key", None),
        "worker_runtime": settings.worker_runtime,
    }
    object.__setattr__(
        settings,
        "database_url",
        "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker?sslmode=verify-ca",
    )
    object.__setattr__(settings, "database_url_encrypted", None)
    object.__setattr__(settings, "database_url_key", None)
    object.__setattr__(settings, "worker_runtime", False)
    monkeypatch.setattr(session_module, "create_engine", fake_create_engine)
    session_module.get_engine.cache_clear()

    try:
        session_module.get_engine()

        ssl_context = captured["kwargs"]["connect_args"]["ssl_context"]
        assert captured["database_url"] == (
            "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
        )
        assert ssl_context.verify_mode == ssl.CERT_REQUIRED
        assert ssl_context.check_hostname is False
    finally:
        for key, value in original_values.items():
            object.__setattr__(settings, key, value)
        session_module.get_engine.cache_clear()


def test_pg8000_engine_translates_sslmode_verify_full(monkeypatch) -> None:
    from app.core.config import settings
    from app.db import session as session_module

    captured = {}

    def fake_create_engine(database_url, **kwargs):
        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(dispose=lambda: None)

    original_values = {
        "database_url": settings.database_url,
        "database_url_encrypted": getattr(settings, "database_url_encrypted", None),
        "database_url_key": getattr(settings, "database_url_key", None),
        "worker_runtime": settings.worker_runtime,
    }
    object.__setattr__(
        settings,
        "database_url",
        "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker?sslmode=verify-full",
    )
    object.__setattr__(settings, "database_url_encrypted", None)
    object.__setattr__(settings, "database_url_key", None)
    object.__setattr__(settings, "worker_runtime", False)
    monkeypatch.setattr(session_module, "create_engine", fake_create_engine)
    session_module.get_engine.cache_clear()

    try:
        session_module.get_engine()

        ssl_context = captured["kwargs"]["connect_args"]["ssl_context"]
        assert captured["database_url"] == (
            "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
        )
        assert ssl_context.verify_mode == ssl.CERT_REQUIRED
        assert ssl_context.check_hostname is True
    finally:
        for key, value in original_values.items():
            object.__setattr__(settings, key, value)
        session_module.get_engine.cache_clear()
