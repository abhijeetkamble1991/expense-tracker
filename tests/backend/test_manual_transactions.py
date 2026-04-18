def test_create_manual_transaction(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert category_response.status_code == 201

    response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "1850.50",
            "description": "Weekend groceries",
            "merchant": "Nature Basket",
            "month_key": "2026-04",
            "expense_category": "personal",
            "spend_category_id": category_response.json()["id"],
            "notes": "manual catch-up",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source_type"] == "manual"
    assert body["review_status"] == "reviewed"


def test_create_manual_transaction_rejects_unknown_spend_category(client, auth_headers):
    response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "1850.50",
            "description": "Weekend groceries",
            "merchant": "Nature Basket",
            "month_key": "2026-04",
            "expense_category": "personal",
            "spend_category_id": 999,
            "notes": "manual catch-up",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Spend category not found"}


def test_create_manual_transaction_rejects_invalid_text_fields(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert category_response.status_code == 201

    response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "1850.50",
            "description": "   ",
            "merchant": "  ",
            "month_key": "2026/04",
            "expense_category": "personal",
            "spend_category_id": category_response.json()["id"],
            "notes": "manual catch-up",
        },
    )

    assert response.status_code == 422
