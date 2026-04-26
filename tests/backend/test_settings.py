from app.core.config import settings

UPDATED_BOOTSTRAP_PASSWORD = f"{settings.bootstrap_password}-updated"


def test_get_settings_returns_profile_and_default_currency(client, auth_headers):
    response = client.get("/settings", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["username"] == settings.bootstrap_username
    assert response.json()["display_name"] == settings.bootstrap_username.title()
    assert response.json()["currency_code"] == "USD"


def test_update_settings_changes_profile_and_currency(client, auth_headers):
    response = client.patch(
        "/settings",
        headers=auth_headers,
        json={"display_name": "Akshay", "currency_code": "INR"},
    )

    assert response.status_code == 200
    assert response.json()["display_name"] == "Akshay"
    assert response.json()["currency_code"] == "INR"

    follow_up = client.get("/settings", headers=auth_headers)
    assert follow_up.status_code == 200
    assert follow_up.json()["display_name"] == "Akshay"
    assert follow_up.json()["currency_code"] == "INR"


def test_update_settings_rejects_invalid_currency_code(client, auth_headers):
    response = client.patch(
        "/settings",
        headers=auth_headers,
        json={"currency_code": "US"},
    )

    assert response.status_code == 422


def test_change_password_updates_login_credentials(client, auth_headers):
    response = client.patch(
        "/settings/password",
        headers=auth_headers,
        json={
            "current_password": settings.bootstrap_password,
            "new_password": UPDATED_BOOTSTRAP_PASSWORD,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"detail": "Password updated"}

    old_login = client.post(
        "/auth/login",
        json={
            "username": settings.bootstrap_username,
            "password": settings.bootstrap_password,
        },
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login",
        json={
            "username": settings.bootstrap_username,
            "password": UPDATED_BOOTSTRAP_PASSWORD,
        },
    )
    assert new_login.status_code == 200


def test_change_password_rejects_wrong_current_password(client, auth_headers):
    response = client.patch(
        "/settings/password",
        headers=auth_headers,
        json={
            "current_password": "wrong-password",
            "new_password": UPDATED_BOOTSTRAP_PASSWORD,
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Current password is incorrect"}
