from fastapi.testclient import TestClient


def test_preflight_allows_configured_frontend_origin() -> None:
    from app.core.config import settings
    from app.main import create_app

    original_value = getattr(settings, "cors_allowed_origins", [])
    object.__setattr__(
        settings,
        "cors_allowed_origins",
        ["https://ep-tracker.dev.ibdp.calibo.com"],
    )

    try:
        with TestClient(create_app(auto_init_db=False)) as client:
            response = client.options(
                "/auth/login",
                headers={
                    "Origin": "https://ep-tracker.dev.ibdp.calibo.com",
                    "Access-Control-Request-Method": "POST",
                },
            )
    finally:
        object.__setattr__(settings, "cors_allowed_origins", original_value)

    assert response.status_code == 200
    assert (
        response.headers["access-control-allow-origin"]
        == "https://ep-tracker.dev.ibdp.calibo.com"
    )
    assert response.headers["access-control-allow-credentials"] == "true"
