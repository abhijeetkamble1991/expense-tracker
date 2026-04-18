def test_review_queue_patch_updates_transaction(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Food Delivery"},
    )
    assert category_response.status_code == 201

    create_response = client.post(
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
    assert create_response.status_code == 201

    transaction_id = create_response.json()["id"]

    update_response = client.patch(
        f"/transactions/{transaction_id}",
        headers=auth_headers,
        json={
            "merchant": "Swiggy",
            "expense_category": "common",
            "spend_category_id": category_response.json()["id"],
            "review_status": "reviewed",
        },
    )

    assert update_response.status_code == 200
    body = update_response.json()
    assert body["merchant"] == "Swiggy"
    assert body["expense_category"] == "common"
    assert body["spend_category_id"] == category_response.json()["id"]
    assert body["review_status"] == "reviewed"
