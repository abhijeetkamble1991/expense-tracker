import sqlite3


def test_init_db_seeds_default_spend_categories(client):
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from app.db.session import get_engine
    from app.models.spend_category import SpendCategory

    with Session(get_engine()) as db:
        category_names = list(
            db.scalars(select(SpendCategory.name).order_by(SpendCategory.name)).all()
        )

    assert category_names == [
        "Bills",
        "Commute",
        "Healthcare",
        "Household",
        "Leisure",
        "Subscriptions",
    ]


def test_init_db_repairs_invalid_bootstrap_password_hash(client):
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from app.core.config import settings
    from app.core.security import verify_password
    from app.db.session import get_engine, init_db
    from app.models.user import User

    with Session(get_engine()) as db:
        user = db.scalar(select(User).where(User.username == settings.bootstrap_username))
        assert user is not None
        user.password_hash = "not-a-valid-hash"
        db.commit()

    init_db()

    with Session(get_engine()) as db:
        repaired_user = db.scalar(
            select(User).where(User.username == settings.bootstrap_username)
        )
        assert repaired_user is not None
        assert verify_password(
            settings.bootstrap_password, repaired_user.password_hash
        )


def test_init_db_migrates_legacy_users_table(client, tmp_path, monkeypatch):
    from app.core.config import settings
    from app.db.session import get_engine, init_db

    legacy_db = tmp_path / "legacy.db"
    connection = sqlite3.connect(legacy_db)
    connection.execute(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME,
            updated_at DATETIME
        )
        """
    )
    connection.execute(
        """
        INSERT INTO users (id, username, password_hash)
        VALUES (?, ?, ?)
        """,
        (1, settings.bootstrap_username, "pbkdf2_sha256$100000$salt$hash"),
    )
    connection.commit()
    connection.close()

    original_values = {
        "database_url": settings.database_url,
        "database_url_encrypted": getattr(settings, "database_url_encrypted", None),
        "database_url_key": getattr(settings, "database_url_key", None),
    }
    object.__setattr__(settings, "database_url", f"sqlite:///{legacy_db}")
    object.__setattr__(settings, "database_url_encrypted", None)
    object.__setattr__(settings, "database_url_key", None)
    get_engine.cache_clear()

    try:
        init_db()
    finally:
        for key, value in original_values.items():
            object.__setattr__(settings, key, value)
        get_engine.cache_clear()

    verification = sqlite3.connect(legacy_db)
    columns = {
        column[1]: column
        for column in verification.execute("PRAGMA table_info(users)").fetchall()
    }
    row = verification.execute(
        "SELECT username, display_name FROM users WHERE id = 1"
    ).fetchone()
    verification.close()

    assert "display_name" in columns
    assert row == (settings.bootstrap_username, "Owner")


def test_init_db_migrates_legacy_transactions_table(client, tmp_path, monkeypatch):
    from app.core.config import settings
    from app.db.session import get_engine, init_db

    legacy_db = tmp_path / "legacy-transactions.db"
    connection = sqlite3.connect(legacy_db)
    connection.execute(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            display_name VARCHAR(120) NOT NULL DEFAULT 'Owner',
            created_at DATETIME,
            updated_at DATETIME
        )
        """
    )
    connection.execute(
        """
        INSERT INTO users (id, username, password_hash, display_name)
        VALUES (?, ?, ?, ?)
        """,
        (
            1,
            settings.bootstrap_username,
            "pbkdf2_sha256$100000$salt$hash",
            settings.bootstrap_username.title(),
        ),
    )
    connection.execute(
        """
        CREATE TABLE transactions (
            id INTEGER PRIMARY KEY,
            transaction_date DATE NOT NULL,
            posted_date DATE,
            amount NUMERIC(12, 2) NOT NULL,
            description TEXT NOT NULL,
            merchant VARCHAR(200) NOT NULL,
            raw_imported_merchant VARCHAR(200),
            month_key VARCHAR(7),
            source_type VARCHAR(30) NOT NULL DEFAULT 'manual',
            expense_category VARCHAR(20) NOT NULL,
            spend_category_id INTEGER,
            import_batch_id INTEGER,
            review_status VARCHAR(20) NOT NULL DEFAULT 'reviewed',
            duplicate_suspected BOOLEAN NOT NULL DEFAULT 0,
            duplicate_reason TEXT,
            source_reference VARCHAR(120),
            notes TEXT,
            created_at DATETIME,
            updated_at DATETIME
        )
        """
    )
    connection.commit()
    connection.close()

    original_values = {
        "database_url": settings.database_url,
        "database_url_encrypted": getattr(settings, "database_url_encrypted", None),
        "database_url_key": getattr(settings, "database_url_key", None),
    }
    object.__setattr__(settings, "database_url", f"sqlite:///{legacy_db}")
    object.__setattr__(settings, "database_url_encrypted", None)
    object.__setattr__(settings, "database_url_key", None)
    get_engine.cache_clear()

    try:
        init_db()
    finally:
        for key, value in original_values.items():
            object.__setattr__(settings, key, value)
        get_engine.cache_clear()

    verification = sqlite3.connect(legacy_db)
    columns = {
        column[1]: column
        for column in verification.execute("PRAGMA table_info(transactions)").fetchall()
    }
    verification.close()

    assert "transaction_time" in columns
    assert "reimburse" in columns
