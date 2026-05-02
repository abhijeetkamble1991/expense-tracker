# Encrypted Database URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add encrypted database URL support with a terminal encryption helper while preserving the existing plaintext configuration path.

**Architecture:** Introduce a focused crypto/config helper that resolves plaintext versus encrypted database URL inputs before existing normalization runs. Keep runtime integration inside the config layer, add a small CLI wrapper in `app/scripts`, and pin behavior with backend tests plus README updates.

**Tech Stack:** Python 3.13, Pydantic Settings, SQLAlchemy, pytest, pure-Python AES helper

---

### Task 1: Add failing tests for encrypted database URL helpers

**Files:**
- Create: `tests/backend/test_database_url_encryption.py`
- Modify: `tests/backend/test_workers_runtime.py`
- Test: `tests/backend/test_database_url_encryption.py`
- Test: `tests/backend/test_workers_runtime.py`

- [ ] **Step 1: Write the failing helper tests**

```python
def test_encrypt_then_decrypt_round_trip():
    ...

def test_resolve_database_url_prefers_encrypted_value():
    ...

def test_resolve_database_url_requires_key_for_encrypted_value():
    ...

def test_resolve_database_url_rejects_wrong_key():
    ...
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/backend/test_database_url_encryption.py -v`
Expected: FAIL because the helper module and functions do not exist yet.

- [ ] **Step 3: Extend worker runtime coverage with encrypted env input**

```python
def test_cloudflare_runtime_env_can_decrypt_database_url(monkeypatch):
    ...
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pytest tests/backend/test_workers_runtime.py::test_cloudflare_runtime_env_can_decrypt_database_url -v`
Expected: FAIL because encrypted runtime env handling is not implemented yet.

### Task 2: Implement the crypto/config helper

**Files:**
- Create: `app/core/database_url_crypto.py`
- Modify: `app/core/config.py`
- Test: `tests/backend/test_database_url_encryption.py`
- Test: `tests/backend/test_workers_runtime.py`

- [ ] **Step 1: Add the minimal crypto API**

```python
def encrypt_database_url(database_url: str, secret_key: str) -> str: ...

def decrypt_database_url(token: str, secret_key: str) -> str: ...

def resolve_database_url(
    database_url: str | None,
    database_url_encrypted: str | None,
    database_url_key: str | None,
) -> str | None: ...
```

- [ ] **Step 2: Integrate resolution into settings**

```python
class Settings(BaseSettings):
    database_url: str = "sqlite:///./expense_tracker.db"
    database_url_encrypted: str | None = None
    database_url_key: str | None = None
```

- [ ] **Step 3: Rework runtime override application to validate merged settings in one pass**

```python
def configure_runtime_settings(**overrides: Any) -> None:
    ...
```

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `pytest tests/backend/test_database_url_encryption.py tests/backend/test_workers_runtime.py -v`
Expected: PASS

### Task 3: Add the terminal encryption helper

**Files:**
- Create: `app/scripts/encrypt_db_url.py`
- Modify: `tests/backend/test_database_url_encryption.py`
- Test: `tests/backend/test_database_url_encryption.py`

- [ ] **Step 1: Add a failing CLI test**

```python
def test_encrypt_script_reads_stdin_and_prints_token(...):
    ...
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/backend/test_database_url_encryption.py::test_encrypt_script_reads_stdin_and_prints_token -v`
Expected: FAIL because the script entrypoint does not exist yet.

- [ ] **Step 3: Implement the script**

```python
def main() -> None:
    ...
```

- [ ] **Step 4: Run the focused script test**

Run: `pytest tests/backend/test_database_url_encryption.py::test_encrypt_script_reads_stdin_and_prints_token -v`
Expected: PASS

### Task 4: Document the operator workflow

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `docs/deployment/cloudflare-workers.md`
- Test: `tests/backend/test_env_config_files.py`

- [ ] **Step 1: Update env examples and deployment docs**

```text
EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED=...
EXPENSE_TRACKER_DATABASE_URL_KEY=...
```

- [ ] **Step 2: Add README documentation for encrypt/decrypt flow**

```markdown
## Encrypted Database URL
...
```

- [ ] **Step 3: Extend env-file assertions if needed**

```python
def test_env_example_contains_...():
    ...
```

- [ ] **Step 4: Run docs/env tests**

Run: `pytest tests/backend/test_env_config_files.py -v`
Expected: PASS

### Task 5: Final verification

**Files:**
- Verify only

- [ ] **Step 1: Run the implementation test set**

Run: `pytest tests/backend/test_database_url_encryption.py tests/backend/test_workers_runtime.py tests/backend/test_env_config_files.py -v`
Expected: PASS

- [ ] **Step 2: Run the broader backend suite if time permits**

Run: `pytest`
Expected: PASS or report pre-existing failures with evidence.
