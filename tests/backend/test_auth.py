def test_login_returns_access_token_for_seeded_user(client):
    response = client.post(
        "/auth/login",
        json={"username": "owner", "password": "secret123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"
