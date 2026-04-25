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
    assert body["reimburse"] is False


def test_create_manual_transaction_allows_reimburse_for_common_only(
    client, auth_headers
):
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
            "expense_category": "common",
            "spend_category_id": category_response.json()["id"],
            "reimburse": True,
            "notes": "manual catch-up",
        },
    )

    assert response.status_code == 201
    assert response.json()["reimburse"] is True


def test_create_manual_transaction_rejects_reimburse_for_personal(
    client, auth_headers
):
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
            "reimburse": True,
            "notes": "manual catch-up",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == (
        "Value error, reimburse can only be enabled for common expenses"
    )


def test_update_transaction_clears_reimburse_when_moved_to_personal(
    client, auth_headers
):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert category_response.status_code == 201

    transaction_response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "1850.50",
            "description": "Weekend groceries",
            "merchant": "Nature Basket",
            "month_key": "2026-04",
            "expense_category": "common",
            "spend_category_id": category_response.json()["id"],
            "reimburse": True,
        },
    )
    assert transaction_response.status_code == 201
    assert transaction_response.json()["reimburse"] is True

    update_response = client.patch(
        f"/transactions/{transaction_response.json()['id']}",
        headers=auth_headers,
        json={
            "expense_category": "personal",
            "review_status": "reviewed",
            "spend_category_id": category_response.json()["id"],
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["expense_category"] == "personal"
    assert update_response.json()["reimburse"] is False


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


def test_create_manual_transaction_rejects_month_key_mismatch(client, auth_headers):
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
            "month_key": "2026-05",
            "expense_category": "personal",
            "spend_category_id": category_response.json()["id"],
            "notes": "manual catch-up",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == (
        "Value error, month_key must match transaction_date"
    )


def test_delete_transaction_removes_existing_row(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )
    assert category_response.status_code == 201

    transaction_response = client.post(
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
        },
    )
    assert transaction_response.status_code == 201

    delete_response = client.delete(
        f"/transactions/{transaction_response.json()['id']}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "deleted_id": transaction_response.json()["id"],
    }

    list_response = client.get("/transactions", headers=auth_headers)
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_delete_transaction_rejects_missing_row(client, auth_headers):
    response = client.delete("/transactions/999", headers=auth_headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Transaction not found"}
