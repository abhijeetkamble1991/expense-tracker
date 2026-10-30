# Encrypted Database URL Design

**Date:** 2026-05-01
**Status:** Approved for implementation planning
**Scope:** Support encrypted database URLs for local runtime and Cloudflare Workers

## 1. Overview

The application currently accepts a plaintext `EXPENSE_TRACKER_DATABASE_URL` and passes it through existing normalization before creating the SQLAlchemy engine.

This change adds an optional encrypted configuration path so operators can store an encrypted database URL in Secret Manager and provide the decryption key separately through an environment variable at runtime.

The system must continue to support the existing plaintext environment variable for backward compatibility and local development simplicity.

## 2. Goals

### Primary goals

- Support both plaintext and encrypted database URL configuration.
- Allow operators to encrypt the database URL from the terminal without putting the plaintext value in shell history.
- Keep the runtime decryption key separate from the encrypted database URL.
- Preserve existing database URL normalization and engine creation behavior after decryption.
- Work in both standard Python runtime and Cloudflare Python Workers.
- Document the operator workflow in a repository `README.md` file.

### Non-goals

- Replacing Secret Manager with application-managed secret storage
- Supporting one-way hashing for connection strings
- Hiding secrets from an attacker who can read both the encrypted value and the runtime decryption key
- Building a full key-rotation service

## 3. Configuration Contract

The runtime will support these environment variables:

- `EXPENSE_TRACKER_DATABASE_URL`
- `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED`
- `EXPENSE_TRACKER_DATABASE_URL_KEY`

Resolution order:

1. If `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED` is present, the application must require `EXPENSE_TRACKER_DATABASE_URL_KEY`, decrypt the value, and use the decrypted URL.
2. Otherwise, if `EXPENSE_TRACKER_DATABASE_URL` is present, the application must use it directly.
3. Otherwise, existing defaults continue to apply.

When both plaintext and encrypted variables are present, the encrypted variable takes precedence. This allows phased rollout without ambiguity.

## 4. Security Model

This feature provides secrecy only when the encrypted database URL and the decryption key are stored separately.

Recommended operator model:

- Store `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED` in Secret Manager.
- Store `EXPENSE_TRACKER_DATABASE_URL_KEY` as a separate runtime secret.
- Do not commit either value to the repository.
- Do not print decrypted values in logs, errors, or helper scripts.

This design protects against accidental disclosure in copied config values and dashboard views, but it does not protect against an attacker who can access both the encrypted payload and the runtime key.

## 5. Cryptography Approach

The implementation must avoid native crypto dependencies because this project targets Cloudflare Python Workers, which officially support pure-Python packages and Pyodide-supported packages.

The recommended implementation is:

- AES-256 encryption using a pure-Python package
- Random salt per payload
- Random IV/nonce per payload
- Key derivation from the provided secret using PBKDF2-HMAC-SHA256
- Authentication using HMAC-SHA256 over the versioned payload components
- Base64url encoding for a copy-paste-safe final token

The payload format must be versioned so future changes remain backward compatible. A concrete shape such as `v1.<base64url-payload>` is sufficient.

## 6. Runtime Behavior

Database URL resolution will happen inside the configuration layer before the current normalization logic runs.

Runtime flow:

1. Read encrypted and plaintext database URL environment variables.
2. If encrypted is present, read the key environment variable.
3. Decode and verify the encrypted payload.
4. Decrypt the database URL bytes and convert them to text.
5. Pass the decrypted plaintext through the current `normalize_database_url()` path.
6. Continue with the existing SQLAlchemy engine creation flow.

Failure conditions must be explicit:

- encrypted value present but key missing
- malformed encrypted token
- unsupported token version
- authentication failure
- decryption failure

These failures must stop startup rather than silently falling back to plaintext or defaults.

## 7. Terminal Encryption Helper

The repository will include a terminal helper script for operators, invoked through Python:

```bash
python -m app.scripts.encrypt_db_url
```

Behavior:

- Read plaintext database URL from `stdin`
- Read encryption key from `EXPENSE_TRACKER_DATABASE_URL_KEY`
- Emit only the encrypted token to `stdout`
- Never echo the plaintext input back to the terminal

Expected usage pattern:

```bash
printf '%s' 'postgresql+pg8000://user:password@host:5432/db?sslmode=require' | \
EXPENSE_TRACKER_DATABASE_URL_KEY='...' python -m app.scripts.encrypt_db_url
```

The helper is intentionally one-way from the operator perspective. The repository does not need a general-purpose decrypt command for human use because decryption is a runtime concern.

## 8. Code Changes

### Configuration

- Extend `app/core/config.py` to resolve encrypted database URLs before normalization.
- Add helper functions for payload parsing, decryption, and error reporting.

### Script

- Add `app/scripts/encrypt_db_url.py` for operator-side encryption.

### Tests

- Add unit tests for encryption/decryption round trip.
- Add settings tests for precedence and missing-key failures.
- Add worker runtime tests for encrypted configuration.

### Documentation

- Add a repository `README.md` section describing:
  - the new environment variables
  - how to encrypt the database URL from the terminal
  - how to store the encrypted value and key separately
  - how plaintext fallback behaves

## 9. Testing Strategy

The implementation must follow TDD with tests written before production changes.

Minimum required test coverage:

- encrypted database URL decrypts to the original plaintext URL
- encrypted value overrides plaintext value
- missing key raises a clear error
- wrong key raises a clear error
- malformed payload raises a clear error
- current plaintext configuration still works unchanged
- Cloudflare runtime env application works when the encrypted value is provided

## 10. Open Decisions Closed by This Spec

The following design decisions are fixed by this spec:

- Keep both plaintext and encrypted configuration paths
- Use stdin for the helper script input
- Use a separate environment variable for the decryption key
- Prefer encrypted value when both values are present
- Document the workflow in `README.md`

## 11. Implementation Boundaries

This work is intentionally limited to database URL encryption support. It does not extend the same mechanism to JWT secrets, bootstrap passwords, or other application secrets in this change set.
