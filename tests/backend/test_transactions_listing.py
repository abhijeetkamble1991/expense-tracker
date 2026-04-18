def _create_transaction(
    client,
    auth_headers,
    *,
    category_id: int,
    transaction_date: str,
    amount: str,
    description: str,
    merchant: str,
    month_key: str,
    expense_category: str,
) -> dict:
    response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": transaction_date,
            "amount": amount,
            "description": description,
            "merchant": merchant,
            "month_key": month_key,
            "expense_category": expense_category,
            "spend_category_id": category_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_list_spend_categories_returns_sorted_categories(client, auth_headers):
    groceries_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert groceries_response.status_code == 201

    utilities_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Utilities"},
    )
    assert utilities_response.status_code == 201

    response = client.get("/spend-categories", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": groceries_response.json()["id"],
            "name": "Groceries",
            "is_active": True,
        },
        {
            "id": utilities_response.json()["id"],
            "name": "Utilities",
            "is_active": True,
        },
    ]


def test_list_transactions_filters_by_month_and_review_status(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]

    april_transaction = _create_transaction(
        client,
        auth_headers,
        category_id=category_id,
        transaction_date="2026-04-11",
        amount="1850.50",
        description="Weekend groceries",
        merchant="Nature Basket",
        month_key="2026-04",
        expense_category="personal",
    )
    _create_transaction(
        client,
        auth_headers,
        category_id=category_id,
        transaction_date="2026-05-02",
        amount="220.00",
        description="Snacks",
        merchant="Foodhall",
        month_key="2026-05",
        expense_category="personal",
    )

    update_response = client.patch(
        f"/transactions/{april_transaction['id']}",
        headers=auth_headers,
        json={"review_status": "flagged"},
    )
    assert update_response.status_code == 200

    response = client.get(
        "/transactions",
        headers=auth_headers,
        params={"month_key": "2026-04", "review_status": "flagged"},
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [april_transaction["id"]]
    assert response.json()[0]["month_key"] == "2026-04"
    assert response.json()[0]["review_status"] == "flagged"
