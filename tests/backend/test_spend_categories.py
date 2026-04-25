from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models.merchant_rule import MerchantRule
from app.models.spend_category import SpendCategory
from app.models.transaction import Transaction


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


def test_update_spend_category_renames_existing_category(client, auth_headers):
    create_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Books"},
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    update_response = client.patch(
        f"/spend-categories/{category_id}",
        headers=auth_headers,
        json={"name": "Books and Media"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Books and Media"


def test_update_spend_category_rejects_duplicate_name(client, auth_headers):
    first_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Books"},
    )
    assert first_response.status_code == 201

    second_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Travel"},
    )
    assert second_response.status_code == 201

    update_response = client.patch(
        f"/spend-categories/{second_response.json()['id']}",
        headers=auth_headers,
        json={"name": "Books"},
    )

    assert update_response.status_code == 409
    assert update_response.json() == {"detail": "Spend category already exists"}


def test_delete_unused_spend_category(client, auth_headers):
    create_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Books"},
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/spend-categories/{category_id}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "deleted_id": category_id,
        "moved_to_review_count": 0,
    }

    with Session(get_engine()) as db:
        deleted_category = db.scalar(
            select(SpendCategory).where(SpendCategory.id == category_id)
        )
        assert deleted_category is None


def test_delete_used_spend_category_requires_confirmation(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Dining"},
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]

    transaction_response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-12",
            "amount": "420.00",
            "description": "Dinner",
            "merchant": "MTR",
            "month_key": "2026-04",
            "expense_category": "common",
            "spend_category_id": category_id,
        },
    )
    assert transaction_response.status_code == 201

    delete_response = client.delete(
        f"/spend-categories/{category_id}",
        headers=auth_headers,
    )

    assert delete_response.status_code == 409
    assert delete_response.json() == {
        "detail": "Deleting this category will move 1 transactions to review",
        "linked_transactions": 1,
    }


def test_confirmed_delete_moves_tagged_transactions_to_review(client, auth_headers):
    category_response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Dining"},
    )
    assert category_response.status_code == 201
    category_id = category_response.json()["id"]

    transaction_response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-12",
            "amount": "420.00",
            "description": "Dinner",
            "merchant": "MTR",
            "month_key": "2026-04",
            "expense_category": "common",
            "spend_category_id": category_id,
        },
    )
    assert transaction_response.status_code == 201
    transaction_id = transaction_response.json()["id"]

    with Session(get_engine()) as db:
        db.add(
            MerchantRule(
                merchant_key="mtr",
                canonical_merchant="MTR",
                expense_category="common",
                spend_category_id=category_id,
            )
        )
        db.commit()

    delete_response = client.delete(
        f"/spend-categories/{category_id}?confirm=true",
        headers=auth_headers,
    )

    assert delete_response.status_code == 200
    assert delete_response.json() == {
        "deleted_id": category_id,
        "moved_to_review_count": 1,
    }

    with Session(get_engine()) as db:
        deleted_category = db.scalar(
            select(SpendCategory).where(SpendCategory.id == category_id)
        )
        assert deleted_category is None

        updated_transaction = db.scalar(
            select(Transaction).where(Transaction.id == transaction_id)
        )
        assert updated_transaction is not None
        assert updated_transaction.spend_category_id is None
        assert updated_transaction.review_status == "needs_review"

        updated_rule = db.scalar(
            select(MerchantRule).where(MerchantRule.merchant_key == "mtr")
        )
        assert updated_rule is not None
        assert updated_rule.spend_category_id is None
