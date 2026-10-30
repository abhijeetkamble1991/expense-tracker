from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import secrets

import jwt

from app.core.config import settings

PBKDF2_ITERATIONS = 100_000


def _jwt_signing_key() -> str:
    if len(settings.jwt_secret) >= 32:
        return settings.jwt_secret
    return hashlib.sha256(settings.jwt_secret.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${password_hash}"


def is_password_hash_supported(stored_password_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected_hash = stored_password_hash.split(
            "$", maxsplit=3
        )
    except (TypeError, ValueError):
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    try:
        int(iterations)
    except ValueError:
        return False

    return bool(salt and expected_hash)


def verify_password(password: str, stored_password_hash: str) -> bool:
    if not is_password_hash_supported(stored_password_hash):
        return False

    _, iterations, salt, expected_hash = stored_password_hash.split("$", maxsplit=3)
    parsed_iterations = int(iterations)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        parsed_iterations,
    ).hex()
    return hmac.compare_digest(password_hash, expected_hash)


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, _jwt_signing_key(), algorithm=settings.jwt_algorithm)
