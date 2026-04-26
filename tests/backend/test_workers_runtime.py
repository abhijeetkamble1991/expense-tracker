from types import SimpleNamespace

from fastapi.testclient import TestClient


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

    monkeypatch.setattr(settings, "database_url", "sqlite:///./expense_tracker.db")
    monkeypatch.setattr(settings, "jwt_secret", "change-me")
    monkeypatch.setattr(settings, "worker_runtime", False)
    get_engine.cache_clear()

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


def test_pg8000_engine_translates_sslmode_require(monkeypatch) -> None:
    from app.core.config import settings
    from app.db import session as session_module

    captured = {}

    def fake_create_engine(database_url, **kwargs):
        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(dispose=lambda: None)

    monkeypatch.setattr(
        settings,
        "database_url",
        "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker?sslmode=require",
    )
    monkeypatch.setattr(settings, "worker_runtime", False)
    monkeypatch.setattr(session_module, "create_engine", fake_create_engine)
    session_module.get_engine.cache_clear()

    session_module.get_engine()

    assert captured["database_url"] == (
        "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
    )
    assert "ssl_context" in captured["kwargs"]["connect_args"]
    session_module.get_engine.cache_clear()
