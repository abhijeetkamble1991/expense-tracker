import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch) -> TestClient:
    from app.core.config import settings
    from app.db.session import get_engine

    monkeypatch.setattr(
        settings,
        "database_url",
        f"sqlite:///{tmp_path / 'test.db'}",
    )
    get_engine.cache_clear()

    from app.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client

    engine = get_engine()
    engine.dispose()
    get_engine.cache_clear()
