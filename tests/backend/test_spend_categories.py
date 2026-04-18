def test_create_spend_category(client, auth_headers):
    response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Groceries"
    assert response.json()["is_active"] is True


def test_create_spend_category_rejects_duplicate_name(client, auth_headers):
    first_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert first_response.status_code == 201

    second_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )

    assert second_response.status_code == 409
    assert second_response.json() == {"detail": "Spend category already exists"}


def test_create_spend_category_rejects_blank_name(client, auth_headers):
    response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "   "},
    )

    assert response.status_code == 422
