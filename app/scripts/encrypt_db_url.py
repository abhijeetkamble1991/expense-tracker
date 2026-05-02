import os
import sys

from app.core.database_url_crypto import encrypt_database_url


def main() -> None:
    database_url = sys.stdin.read().strip()
    secret_key = os.environ.get("EXPENSE_TRACKER_DATABASE_URL_KEY", "").strip()

    if not database_url:
        raise ValueError("Expected a database URL on stdin.")
    if not secret_key:
        raise ValueError("EXPENSE_TRACKER_DATABASE_URL_KEY is required.")

    print(encrypt_database_url(database_url, secret_key))


if __name__ == "__main__":
    main()
