def test_create_spend_category(client, auth_headers):
    response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Groceries"
    assert response.json()["is_active"] is True
