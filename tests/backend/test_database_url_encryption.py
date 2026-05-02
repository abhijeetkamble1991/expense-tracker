import io

import pytest


def test_encrypt_then_decrypt_round_trip() -> None:
    from app.core.database_url_crypto import decrypt_database_url, encrypt_database_url

    database_url = (
        "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
        "?sslmode=require"
    )

    token = encrypt_database_url(database_url, "unit-test-key")

    assert token.startswith("v1.")
    assert decrypt_database_url(token, "unit-test-key") == database_url


def test_resolve_database_url_prefers_encrypted_value() -> None:
    from app.core.database_url_crypto import encrypt_database_url, resolve_database_url

    encrypted_url = "postgres://worker:secret@example.com:5432/expense_tracker"
    encrypted_value = encrypt_database_url(encrypted_url, "unit-test-key")

    assert (
        resolve_database_url(
            "sqlite:///./expense_tracker.db",
            encrypted_value,
            "unit-test-key",
        )
        == encrypted_url
    )


def test_resolve_database_url_requires_key_for_encrypted_value() -> None:
    from app.core.database_url_crypto import encrypt_database_url, resolve_database_url

    encrypted_value = encrypt_database_url(
        "postgres://worker:secret@example.com:5432/expense_tracker",
        "unit-test-key",
    )

    with pytest.raises(ValueError, match="EXPENSE_TRACKER_DATABASE_URL_KEY"):
        resolve_database_url(None, encrypted_value, None)


def test_resolve_database_url_rejects_wrong_key() -> None:
    from app.core.database_url_crypto import encrypt_database_url, resolve_database_url

    encrypted_value = encrypt_database_url(
        "postgres://worker:secret@example.com:5432/expense_tracker",
        "unit-test-key",
    )

    with pytest.raises(ValueError, match="database URL"):
        resolve_database_url(None, encrypted_value, "wrong-key")


def test_encrypt_script_reads_stdin_and_prints_token(
    monkeypatch, capsys
) -> None:
    from app.core.database_url_crypto import decrypt_database_url
    from app.scripts.encrypt_db_url import main

    monkeypatch.setattr(
        "sys.stdin",
        io.StringIO(
            "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
        ),
    )
    monkeypatch.setenv("EXPENSE_TRACKER_DATABASE_URL_KEY", "script-test-key")

    main()

    output = capsys.readouterr().out.strip()

    assert output.startswith("v1.")
    assert (
        decrypt_database_url(output, "script-test-key")
        == "postgresql+pg8000://worker:secret@example.com:5432/expense_tracker"
    )
