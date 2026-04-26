from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_engine
from app.models.user import User


def test_login_returns_access_token_for_seeded_user(client):
    response = client.post(
        "/auth/login",
        json={
            "username": settings.bootstrap_username,
            "password": settings.bootstrap_password,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"


def test_login_rejects_malformed_stored_password_hash(client):
    with Session(get_engine()) as db:
        user = db.scalar(select(User).where(User.username == settings.bootstrap_username))
        assert user is not None
        user.password_hash = "not-a-valid-hash"
        db.commit()

    response = client.post(
        "/auth/login",
        json={
            "username": settings.bootstrap_username,
            "password": settings.bootstrap_password,
        },
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid credentials"}
