from __future__ import annotations

import base64
import hashlib
import hmac
import os

_PAYLOAD_VERSION = "v1"
_SALT_SIZE = 16
_NONCE_SIZE = 16
_MAC_SIZE = 32
_PBKDF2_ITERATIONS = 390_000
_DERIVED_KEY_SIZE = 64


def _encode_payload(payload: bytes) -> str:
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _decode_payload(payload: str) -> bytes:
    padding = "=" * (-len(payload) % 4)
    try:
        return base64.urlsafe_b64decode(f"{payload}{padding}")
    except Exception as exc:  # pragma: no cover - exact exception is input-dependent
        raise ValueError("Invalid encrypted database URL payload.") from exc


def _derive_keys(secret_key: str, salt: bytes) -> tuple[bytes, bytes]:
    key_material = hashlib.pbkdf2_hmac(
        "sha256",
        secret_key.encode("utf-8"),
        salt,
        _PBKDF2_ITERATIONS,
        dklen=_DERIVED_KEY_SIZE,
    )
    return key_material[:32], key_material[32:]


def _keystream(encryption_key: bytes, nonce: bytes, length: int) -> bytes:
    blocks: list[bytes] = []
    counter = 0

    while sum(len(block) for block in blocks) < length:
        counter_bytes = counter.to_bytes(8, "big")
        blocks.append(
            hmac.new(encryption_key, nonce + counter_bytes, hashlib.sha256).digest()
        )
        counter += 1

    return b"".join(blocks)[:length]


def _xor_bytes(left: bytes, right: bytes) -> bytes:
    return bytes(a ^ b for a, b in zip(left, right, strict=True))


def encrypt_database_url(database_url: str, secret_key: str) -> str:
    if not database_url:
        raise ValueError("database_url must not be empty.")
    if not secret_key:
        raise ValueError("secret_key must not be empty.")

    salt = os.urandom(_SALT_SIZE)
    nonce = os.urandom(_NONCE_SIZE)
    encryption_key, signing_key = _derive_keys(secret_key, salt)
    plaintext = database_url.encode("utf-8")
    ciphertext = _xor_bytes(
        plaintext,
        _keystream(encryption_key, nonce, len(plaintext)),
    )
    mac = hmac.new(
        signing_key,
        _PAYLOAD_VERSION.encode("ascii") + salt + nonce + ciphertext,
        hashlib.sha256,
    ).digest()
    return f"{_PAYLOAD_VERSION}.{_encode_payload(salt + nonce + ciphertext + mac)}"


def decrypt_database_url(token: str, secret_key: str) -> str:
    if not secret_key:
        raise ValueError("EXPENSE_TRACKER_DATABASE_URL_KEY must not be empty.")

    try:
        version, payload = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid encrypted database URL token format.") from exc

    if version != _PAYLOAD_VERSION:
        raise ValueError("Unsupported encrypted database URL token version.")

    decoded_payload = _decode_payload(payload)
    minimum_size = _SALT_SIZE + _NONCE_SIZE + _MAC_SIZE
    if len(decoded_payload) <= minimum_size:
        raise ValueError("Invalid encrypted database URL payload.")

    salt = decoded_payload[:_SALT_SIZE]
    nonce = decoded_payload[_SALT_SIZE : _SALT_SIZE + _NONCE_SIZE]
    ciphertext = decoded_payload[_SALT_SIZE + _NONCE_SIZE : -_MAC_SIZE]
    expected_mac = decoded_payload[-_MAC_SIZE:]
    encryption_key, signing_key = _derive_keys(secret_key, salt)
    actual_mac = hmac.new(
        signing_key,
        version.encode("ascii") + salt + nonce + ciphertext,
        hashlib.sha256,
    ).digest()
    if not hmac.compare_digest(expected_mac, actual_mac):
        raise ValueError(
            "Unable to decrypt database URL with the provided "
            "EXPENSE_TRACKER_DATABASE_URL_KEY."
        )

    plaintext = _xor_bytes(
        ciphertext,
        _keystream(encryption_key, nonce, len(ciphertext)),
    )
    try:
        return plaintext.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("Decrypted database URL is not valid UTF-8.") from exc


def resolve_database_url(
    database_url: str | None,
    database_url_encrypted: str | None,
    database_url_key: str | None,
) -> str | None:
    if database_url_encrypted:
        if not database_url_key:
            raise ValueError(
                "EXPENSE_TRACKER_DATABASE_URL_KEY is required when "
                "EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED is set."
            )
        return decrypt_database_url(database_url_encrypted, database_url_key)
    return database_url
