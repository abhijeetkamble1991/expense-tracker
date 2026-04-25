import sqlite3


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
        VALUES (1, 'owner', 'pbkdf2_sha256$100000$salt$hash')
        """
    )
    connection.commit()
    connection.close()

    monkeypatch.setattr(settings, "database_url", f"sqlite:///{legacy_db}")
    get_engine.cache_clear()

    init_db()

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
    assert row == ("owner", "Owner")


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
        VALUES (1, 'owner', 'pbkdf2_sha256$100000$salt$hash', 'Owner')
        """
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

    monkeypatch.setattr(settings, "database_url", f"sqlite:///{legacy_db}")
    get_engine.cache_clear()

    init_db()

    verification = sqlite3.connect(legacy_db)
    columns = {
        column[1]: column
        for column in verification.execute("PRAGMA table_info(transactions)").fetchall()
    }
    verification.close()

    assert "transaction_time" in columns
    assert "reimburse" in columns
