# Expense Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user FastAPI + React + SQLite expense tracker that supports login, PDF statement import, transaction review, manual entry, editable spend categories, and monthly reports.

**Architecture:** Keep the backend in the root Python package and place the React app in `frontend/`. Use FastAPI with SQLAlchemy and SQLite for persistence, a parser service that normalizes UPI and credit-card statements into one transaction ledger, and a React client that centers the user on a month-scoped `upload -> review -> report` workflow.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic, Passlib bcrypt, PyJWT, pdfplumber, pypdf, pytest, React 18, TypeScript, Vite, React Router, TanStack Query, Axios, Recharts, React Hook Form, Playwright

---

## Proposed File Structure

- `pyproject.toml`: Python dependencies, pytest config, local scripts
- `app/main.py`: FastAPI entrypoint, middleware, router registration
- `app/core/config.py`: settings and environment loading
- `app/core/security.py`: password hashing and JWT helpers
- `app/db/session.py`: engine, session factory, dependency helpers
- `app/db/base.py`: SQLAlchemy declarative base
- `app/models/*.py`: user, spend category, import batch, merchant rule, transaction, monthly report
- `app/schemas/*.py`: request/response models
- `app/api/routes/*.py`: auth, months, imports, transactions, spend categories, reports
- `app/services/parsers/*.py`: parser interface, UPI parser, credit-card parser
- `app/services/imports.py`: PDF classification, parsing orchestration, duplicate detection
- `app/services/reports.py`: month aggregation and snapshot regeneration
- `app/services/merchant_rules.py`: merchant suggestion helpers
- `app/seed.py`: initial local-user bootstrap and default spend categories
- `alembic/`: migrations
- `tests/backend/conftest.py`: test DB, auth helpers, fixture clients
- `tests/backend/**/*.py`: API, parser, normalization, report tests
- `frontend/package.json`: React app dependencies and scripts
- `frontend/src/main.tsx`: React bootstrap
- `frontend/src/app/router.tsx`: route map
- `frontend/src/app/query-client.ts`: TanStack Query client
- `frontend/src/lib/api.ts`: Axios instance with auth header handling
- `frontend/src/features/auth/*`: login page and auth store
- `frontend/src/features/reports/*`: month report page and summary widgets
- `frontend/src/features/imports/*`: upload page and import batch summary
- `frontend/src/features/review/*`: review queue table and inline edit controls
- `frontend/src/features/transactions/*`: all-transactions view
- `frontend/src/features/manual-entry/*`: manual expense form
- `frontend/src/features/spend-categories/*`: category CRUD screen
- `frontend/src/components/layout/*`: app shell, nav, month selector
- `frontend/src/test/*`: RTL setup and mocked API fixtures
- `frontend/tests/e2e/*.spec.ts`: Playwright critical-path tests

### Task 1: Scaffold the FastAPI backend and backend test harness

**Files:**
- Modify: `pyproject.toml`
- Create: `app/__init__.py`
- Create: `app/main.py`
- Create: `app/api/__init__.py`
- Create: `app/api/routes/__init__.py`
- Create: `app/api/routes/health.py`
- Create: `tests/backend/conftest.py`
- Test: `tests/backend/test_health.py`

- [ ] **Step 1: Write the failing backend health test**

```python
# tests/backend/test_health.py
def test_health_endpoint_returns_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/backend/test_health.py -q`
Expected: FAIL with `ModuleNotFoundError` for `app.main` or a missing `/health` route.

- [ ] **Step 3: Write the minimal FastAPI app and test client**

```python
# app/main.py
from fastapi import FastAPI

from app.api.routes.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="Expense Tracker API")
    app.include_router(health_router)
    return app


app = create_app()
```

```python
# app/api/routes/health.py
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
```

```python
# tests/backend/conftest.py
import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())
```

```toml
# pyproject.toml
[project]
name = "expense-tracker"
version = "0.1.0"
description = "Monthly expense tracker with PDF import and reporting"
readme = "README.md"
requires-python = ">=3.14"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn>=0.30.0",
  "httpx>=0.28.0",
  "pytest>=8.3.0",
]

[tool.pytest.ini_options]
testpaths = ["tests/backend"]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/backend/test_health.py -q`
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml app tests/backend
git commit -m "feat: scaffold backend app and health check"
```

### Task 2: Add database setup, auth, and first-run local user bootstrap

**Files:**
- Modify: `pyproject.toml`
- Create: `app/core/config.py`
- Create: `app/core/security.py`
- Create: `app/db/base.py`
- Create: `app/db/session.py`
- Create: `app/models/__init__.py`
- Create: `app/models/user.py`
- Create: `app/schemas/auth.py`
- Create: `app/api/routes/auth.py`
- Create: `app/seed.py`
- Modify: `app/main.py`
- Modify: `tests/backend/conftest.py`
- Test: `tests/backend/test_auth.py`

- [ ] **Step 1: Write the failing auth test**

```python
# tests/backend/test_auth.py
def test_login_returns_access_token_for_seeded_user(client):
    response = client.post(
        "/auth/login",
        json={"username": "owner", "password": "secret123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pytest tests/backend/test_auth.py -q`
Expected: FAIL with missing `/auth/login` route or missing database session.

- [ ] **Step 3: Implement settings, SQLite session, user model, seed, and login**

```python
# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./expense_tracker.db"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    bootstrap_username: str = "owner"
    bootstrap_password: str = "secret123"

    model_config = SettingsConfigDict(env_prefix="EXPENSE_TRACKER_", env_file=".env")


settings = Settings()
```

```python
# app/models/user.py
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
```

```python
# app/api/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(str(user.id)), token_type="bearer")
```

```python
# app/seed.py
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def ensure_bootstrap_user(db: Session) -> None:
    if db.scalar(select(User).where(User.username == settings.bootstrap_username)):
        return
    db.add(
        User(
            username=settings.bootstrap_username,
            password_hash=hash_password(settings.bootstrap_password),
        )
    )
    db.commit()
```

- [ ] **Step 4: Run the auth tests**

Run: `pytest tests/backend/test_auth.py tests/backend/test_health.py -q`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml app tests/backend
git commit -m "feat: add SQLite auth and bootstrap user"
```

### Task 3: Add spend categories and manual expense creation APIs

**Files:**
- Create: `app/models/spend_category.py`
- Create: `app/models/transaction.py`
- Create: `app/schemas/spend_category.py`
- Create: `app/schemas/transaction.py`
- Create: `app/api/routes/spend_categories.py`
- Create: `app/api/routes/transactions.py`
- Create: `app/api/deps.py`
- Modify: `app/main.py`
- Modify: `tests/backend/conftest.py`
- Test: `tests/backend/test_spend_categories.py`
- Test: `tests/backend/test_manual_transactions.py`

- [ ] **Step 1: Write failing tests for category CRUD and manual entry**

```python
# tests/backend/test_spend_categories.py
def test_create_spend_category(client, auth_headers):
    response = client.post(
        "/spend-categories",
        headers=auth_headers,
        json={"name": "Groceries"},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Groceries"
    assert response.json()["is_active"] is True
```

```python
# tests/backend/test_manual_transactions.py
def test_create_manual_transaction(client, auth_headers):
    response = client.post(
        "/transactions/manual",
        headers=auth_headers,
        json={
            "transaction_date": "2026-04-11",
            "amount": "1850.50",
            "description": "Weekend groceries",
            "merchant": "Nature Basket",
            "month_key": "2026-04",
            "expense_category": "personal",
            "spend_category_id": 1,
            "notes": "manual catch-up",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["source_type"] == "manual"
    assert body["review_status"] == "reviewed"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest tests/backend/test_spend_categories.py tests/backend/test_manual_transactions.py -q`
Expected: FAIL with missing models, auth dependency, or route registration.

- [ ] **Step 3: Implement spend categories, transaction model, auth dependency, and manual-entry route**

```python
# app/models/spend_category.py
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SpendCategory(Base):
    __tablename__ = "spend_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

```python
# app/models/transaction.py
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    posted_date: Mapped[date | None] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    merchant: Mapped[str] = mapped_column(String(200), nullable=False)
    month_key: Mapped[str] = mapped_column(String(7), index=True)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    expense_category: Mapped[str] = mapped_column(String(20), nullable=False)
    spend_category_id: Mapped[int | None] = mapped_column(ForeignKey("spend_categories.id"))
    import_batch_id: Mapped[int | None] = mapped_column(Integer)
    review_status: Mapped[str] = mapped_column(String(20), nullable=False)
    duplicate_suspected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_reason: Mapped[str | None] = mapped_column(Text)
    source_reference: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
```

```python
# app/api/routes/transactions.py
@router.post("/manual", response_model=TransactionRead, status_code=201)
def create_manual_transaction(
    payload: ManualTransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionRead:
    transaction = Transaction(
        **payload.model_dump(),
        source_type="manual",
        review_status="reviewed",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return TransactionRead.model_validate(transaction)
```

- [ ] **Step 4: Run the tests to verify the API works**

Run: `pytest tests/backend/test_spend_categories.py tests/backend/test_manual_transactions.py -q`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add app tests/backend
git commit -m "feat: add spend categories and manual transactions"
```

### Task 4: Add PDF parser interfaces and normalization tests for UPI and credit-card statements

**Files:**
- Modify: `pyproject.toml`
- Create: `app/services/parsers/__init__.py`
- Create: `app/services/parsers/base.py`
- Create: `app/services/parsers/upi.py`
- Create: `app/services/parsers/credit_card.py`
- Create: `app/services/parsers/normalize.py`
- Create: `tests/backend/fixtures/upi_statement.txt`
- Create: `tests/backend/fixtures/credit_card_statement.txt`
- Test: `tests/backend/test_upi_parser.py`
- Test: `tests/backend/test_credit_card_parser.py`
- Test: `tests/backend/test_normalize_transactions.py`

- [ ] **Step 1: Write failing parser and normalization tests**

```python
# tests/backend/test_upi_parser.py
from pathlib import Path

from app.services.parsers.upi import parse_upi_statement_text


def test_parse_upi_statement_text_extracts_debit_rows():
    raw_text = Path("tests/backend/fixtures/upi_statement.txt").read_text()

    rows = parse_upi_statement_text(raw_text)

    assert len(rows) == 2
    assert rows[0].description.startswith("UPI/")
    assert rows[0].amount == "425.00"
```

```python
# tests/backend/test_normalize_transactions.py
from app.services.parsers.normalize import normalize_parsed_row
from app.services.parsers.base import ParsedRow


def test_normalize_parsed_row_marks_imported_expense_for_review():
    row = ParsedRow(
        transaction_date="2026-04-09",
        posted_date=None,
        amount="425.00",
        description="UPI/FOODMART/12345",
        merchant_guess="FOODMART",
        direction="debit",
        source_reference="12345",
    )

    normalized = normalize_parsed_row(row=row, month_key="2026-04", source_type="upi_pdf")

    assert normalized.review_status == "needs_review"
    assert normalized.expense_category == "personal"
    assert normalized.source_type == "upi_pdf"
```

- [ ] **Step 2: Run the parser tests to verify they fail**

Run: `pytest tests/backend/test_upi_parser.py tests/backend/test_credit_card_parser.py tests/backend/test_normalize_transactions.py -q`
Expected: FAIL with missing parser modules or functions.

- [ ] **Step 3: Implement parser dataclasses, regex-based extractors, and normalization**

```python
# app/services/parsers/base.py
from dataclasses import dataclass


@dataclass(slots=True)
class ParsedRow:
    transaction_date: str
    posted_date: str | None
    amount: str
    description: str
    merchant_guess: str
    direction: str
    source_reference: str | None
```

```python
# app/services/parsers/upi.py
import re

from app.services.parsers.base import ParsedRow


UPI_LINE = re.compile(
    r"(?P<date>\d{2}/\d{2}/\d{4}).*?(?P<description>UPI/[^\\n]+?)\\s+(?P<amount>\\d+\\.\\d{2})\\s+(?P<direction>DR|CR)"
)


def parse_upi_statement_text(raw_text: str) -> list[ParsedRow]:
    rows: list[ParsedRow] = []
    for match in UPI_LINE.finditer(raw_text):
        if match.group("direction") != "DR":
            continue
        description = match.group("description")
        rows.append(
            ParsedRow(
                transaction_date=match.group("date"),
                posted_date=None,
                amount=match.group("amount"),
                description=description,
                merchant_guess=description.split("/")[1],
                direction="debit",
                source_reference=description.split("/")[-1],
            )
        )
    return rows
```

```python
# app/services/parsers/normalize.py
from dataclasses import dataclass

from app.services.parsers.base import ParsedRow


@dataclass(slots=True)
class NormalizedImportRow:
    transaction_date: str
    amount: str
    description: str
    merchant: str
    month_key: str
    source_type: str
    expense_category: str
    review_status: str
    source_reference: str | None


def normalize_parsed_row(row: ParsedRow, month_key: str, source_type: str) -> NormalizedImportRow:
    return NormalizedImportRow(
        transaction_date=row.transaction_date,
        amount=row.amount,
        description=row.description,
        merchant=row.merchant_guess,
        month_key=month_key,
        source_type=source_type,
        expense_category="personal",
        review_status="needs_review",
        source_reference=row.source_reference,
    )
```

- [ ] **Step 4: Run the parser tests**

Run: `pytest tests/backend/test_upi_parser.py tests/backend/test_credit_card_parser.py tests/backend/test_normalize_transactions.py -q`
Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml app/services tests/backend
git commit -m "feat: add statement parsers and normalization"
```

### Task 5: Implement import batches, upload workflow, merchant suggestions, and review queue

**Files:**
- Create: `app/models/import_batch.py`
- Create: `app/models/merchant_rule.py`
- Modify: `app/models/transaction.py`
- Create: `app/schemas/imports.py`
- Create: `app/services/merchant_rules.py`
- Create: `app/services/imports.py`
- Create: `app/api/routes/imports.py`
- Modify: `app/api/routes/transactions.py`
- Modify: `app/main.py`
- Test: `tests/backend/test_imports.py`
- Test: `tests/backend/test_review_queue.py`

- [ ] **Step 1: Write failing tests for import upload and review updates**

```python
# tests/backend/test_imports.py
from io import BytesIO


def test_upload_import_creates_batch_and_review_rows(client, auth_headers, monkeypatch):
    from app.services.imports import NormalizedImportRow

    def fake_process_pdf(*args, **kwargs):
        return (
            {
                "source_type": "upi_pdf",
                "parser_type": "upi",
                "parse_status": "success",
                "warnings": [],
            },
            [
                NormalizedImportRow(
                    transaction_date="2026-04-09",
                    amount="425.00",
                    description="UPI/FOODMART/12345",
                    merchant="FOODMART",
                    month_key="2026-04",
                    source_type="upi_pdf",
                    expense_category="personal",
                    review_status="needs_review",
                    source_reference="12345",
                )
            ],
        )

    monkeypatch.setattr("app.api.routes.imports.process_pdf_upload", fake_process_pdf)

    response = client.post(
        "/imports",
        headers=auth_headers,
        data={"month_key": "2026-04"},
        files={"file": ("upi.pdf", BytesIO(b"fake"), "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["parse_status"] == "success"
    assert response.json()["extracted_count"] == 1
```

```python
# tests/backend/test_review_queue.py
def test_review_update_can_override_spend_category(client, auth_headers, seeded_transaction, seeded_category):
    response = client.patch(
        f"/transactions/{seeded_transaction.id}",
        headers=auth_headers,
        json={
            "merchant": "Food Mart",
            "expense_category": "common",
            "spend_category_id": seeded_category.id,
            "review_status": "reviewed",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["expense_category"] == "common"
    assert body["review_status"] == "reviewed"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest tests/backend/test_imports.py tests/backend/test_review_queue.py -q`
Expected: FAIL with missing batch model, upload route, or transaction patch behavior.

- [ ] **Step 3: Implement import batches, upload orchestration, duplicate flags, merchant rules, and transaction review updates**

```python
# app/models/import_batch.py
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    month_key: Mapped[str] = mapped_column(String(7), index=True)
    source_type: Mapped[str] = mapped_column(String(30))
    original_filename: Mapped[str] = mapped_column(String(255))
    parser_type: Mapped[str] = mapped_column(String(30))
    parse_status: Mapped[str] = mapped_column(String(30))
    extracted_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    flagged_count: Mapped[int] = mapped_column(Integer, default=0)
    warnings_json: Mapped[str] = mapped_column(Text, default="[]")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

```python
# app/services/imports.py
def is_duplicate_candidate(existing: Transaction, incoming: NormalizedImportRow) -> bool:
    return (
        str(existing.amount) == incoming.amount
        and existing.transaction_date.isoformat() == incoming.transaction_date
        and existing.merchant.lower() == incoming.merchant.lower()
    )
```

```python
# app/api/routes/imports.py
@router.post("", response_model=ImportBatchRead, status_code=201)
def upload_import(
    month_key: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ImportBatchRead:
    metadata, rows = process_pdf_upload(file=file, month_key=month_key, db=db)
    batch = ImportBatch(
        month_key=month_key,
        source_type=metadata["source_type"],
        original_filename=file.filename or "statement.pdf",
        parser_type=metadata["parser_type"],
        parse_status=metadata["parse_status"],
        extracted_count=len(rows),
        skipped_count=metadata.get("skipped_count", 0),
        flagged_count=sum(1 for row in rows if row.review_status == "flagged"),
        warnings_json=json.dumps(metadata["warnings"]),
    )
    db.add(batch)
    db.flush()
    for row in rows:
        db.add(
            Transaction(
                transaction_date=row.transaction_date,
                amount=row.amount,
                description=row.description,
                merchant=row.merchant,
                month_key=row.month_key,
                source_type=row.source_type,
                expense_category=row.expense_category,
                review_status=row.review_status,
                source_reference=row.source_reference,
                import_batch_id=batch.id,
            )
        )
    db.commit()
    db.refresh(batch)
    return ImportBatchRead.model_validate(batch)
```

- [ ] **Step 4: Run import and review tests**

Run: `pytest tests/backend/test_imports.py tests/backend/test_review_queue.py -q`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add app tests/backend
git commit -m "feat: add import batches and review workflow"
```

### Task 6: Build month listing and monthly report aggregation endpoints

**Files:**
- Create: `app/models/monthly_report.py`
- Create: `app/schemas/report.py`
- Create: `app/services/reports.py`
- Create: `app/api/routes/reports.py`
- Create: `app/api/routes/months.py`
- Modify: `app/main.py`
- Test: `tests/backend/test_reports.py`
- Test: `tests/backend/test_months.py`

- [ ] **Step 1: Write failing tests for month listing and report generation**

```python
# tests/backend/test_reports.py
def test_regenerate_report_returns_summary_for_month(client, auth_headers, seeded_month_data):
    response = client.post("/reports/2026-04/regenerate", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["month_key"] == "2026-04"
    assert body["totals"]["overall"] == "2275.50"
    assert body["totals"]["common"] == "425.00"
```

```python
# tests/backend/test_months.py
def test_months_endpoint_returns_available_months(client, auth_headers, seeded_month_data):
    response = client.get("/months", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == ["2026-04"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest tests/backend/test_reports.py tests/backend/test_months.py -q`
Expected: FAIL with missing routes or missing aggregation service.

- [ ] **Step 3: Implement report aggregation and month listing**

```python
# app/services/reports.py
from collections import defaultdict
from decimal import Decimal


def build_month_report(transactions: list[Transaction]) -> dict:
    totals = {"overall": Decimal("0.00"), "common": Decimal("0.00"), "personal": Decimal("0.00")}
    by_category = defaultdict(Decimal)
    by_merchant = defaultdict(Decimal)
    by_source = defaultdict(Decimal)

    for transaction in transactions:
        totals["overall"] += transaction.amount
        totals[transaction.expense_category] += transaction.amount
        by_source[transaction.source_type] += transaction.amount
        by_merchant[transaction.merchant] += transaction.amount
        if transaction.spend_category_id:
            by_category[str(transaction.spend_category_id)] += transaction.amount

    return {
        "totals": {key: f"{value:.2f}" for key, value in totals.items()},
        "by_source": {key: f"{value:.2f}" for key, value in by_source.items()},
        "by_merchant": {key: f"{value:.2f}" for key, value in by_merchant.items()},
        "by_spend_category": {key: f"{value:.2f}" for key, value in by_category.items()},
    }
```

```python
# app/api/routes/reports.py
@router.post("/{month_key}/regenerate", response_model=MonthlyReportResponse)
def regenerate_report(month_key: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    transactions = list(
        db.scalars(select(Transaction).where(Transaction.month_key == month_key).order_by(Transaction.transaction_date))
    )
    summary = build_month_report(transactions)
    return MonthlyReportResponse(month_key=month_key, **summary, transactions=transactions)
```

- [ ] **Step 4: Run the report tests**

Run: `pytest tests/backend/test_reports.py tests/backend/test_months.py -q`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add app tests/backend
git commit -m "feat: add monthly report aggregation"
```

### Task 7: Scaffold the React frontend, auth flow, and report-centric app shell

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/app/query-client.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Create: `frontend/src/features/reports/ReportHomePage.tsx`
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/test/app-shell.test.tsx`

- [ ] **Step 1: Write the failing frontend shell test**

```tsx
// frontend/src/test/app-shell.test.tsx
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { routerConfig } from "../app/router";

test("unauthenticated users land on the login screen", async () => {
  const router = createMemoryRouter(routerConfig, { initialEntries: ["/reports"] });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: /sign in/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `npm --prefix frontend test -- app-shell.test.tsx`
Expected: FAIL with missing Vite app or missing router modules.

- [ ] **Step 3: Implement the React scaffold, router, login page, and minimalist app shell**

```tsx
// frontend/src/app/router.tsx
import { Navigate } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { ReportHomePage } from "../features/reports/ReportHomePage";

export const routerConfig = [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/reports" replace /> },
      { path: "reports", element: <ReportHomePage /> },
    ],
  },
];
```

```tsx
// frontend/src/components/layout/AppShell.tsx
import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/reports", label: "Reports" },
  { to: "/upload", label: "Upload" },
  { to: "/review", label: "Review Queue" },
  { to: "/transactions", label: "Transactions" },
  { to: "/manual-entry", label: "Add Expense" },
  { to: "/categories", label: "Categories" },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header>
        <h1>Expense Tracker</h1>
        <nav>{links.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}</nav>
      </header>
      <main><Outlet /></main>
    </div>
  );
}
```

- [ ] **Step 4: Run the frontend test**

Run: `npm --prefix frontend test -- app-shell.test.tsx`
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: scaffold React app shell and auth flow"
```

### Task 8: Build upload, review, manual-entry, categories, and report pages

**Files:**
- Create: `frontend/src/features/imports/UploadPage.tsx`
- Create: `frontend/src/features/review/ReviewQueuePage.tsx`
- Create: `frontend/src/features/review/ReviewTable.tsx`
- Create: `frontend/src/features/manual-entry/ManualEntryPage.tsx`
- Create: `frontend/src/features/spend-categories/SpendCategoriesPage.tsx`
- Modify: `frontend/src/features/reports/ReportHomePage.tsx`
- Modify: `frontend/src/app/router.tsx`
- Test: `frontend/src/test/report-home.test.tsx`
- Test: `frontend/src/test/review-queue.test.tsx`

- [ ] **Step 1: Write failing tests for report summary and review queue rendering**

```tsx
// frontend/src/test/report-home.test.tsx
import { render, screen } from "@testing-library/react";

import { ReportHomePage } from "../features/reports/ReportHomePage";

test("report home renders month totals and pending review count", async () => {
  render(<ReportHomePage />);

  expect(await screen.findByText(/month total/i)).toBeInTheDocument();
  expect(screen.getByText(/needs review/i)).toBeInTheDocument();
});
```

```tsx
// frontend/src/test/review-queue.test.tsx
import { render, screen } from "@testing-library/react";

import { ReviewQueuePage } from "../features/review/ReviewQueuePage";

test("review queue shows imported transactions ready for correction", async () => {
  render(<ReviewQueuePage />);

  expect(await screen.findByRole("table")).toBeInTheDocument();
  expect(screen.getByText(/expense category/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the frontend page tests to verify they fail**

Run: `npm --prefix frontend test -- report-home.test.tsx review-queue.test.tsx`
Expected: FAIL with missing feature pages or missing data hooks.

- [ ] **Step 3: Implement the month workflow pages and minimal data hooks**

```tsx
// frontend/src/features/reports/ReportHomePage.tsx
export function ReportHomePage() {
  return (
    <section>
      <header>
        <p>April 2026</p>
        <h2>Monthly Report</h2>
      </header>
      <div className="summary-strip">
        <article><span>Month Total</span><strong>₹2,275.50</strong></article>
        <article><span>Common</span><strong>₹425.00</strong></article>
        <article><span>Personal</span><strong>₹1,850.50</strong></article>
        <article><span>Needs Review</span><strong>3</strong></article>
      </div>
      <div className="report-grid">
        <section>Category chart</section>
        <section>Merchant summary</section>
        <section>Detailed transactions</section>
      </div>
    </section>
  );
}
```

```tsx
// frontend/src/features/review/ReviewQueuePage.tsx
export function ReviewQueuePage() {
  return (
    <section>
      <header>
        <h2>Review Queue</h2>
        <p>Confirm imported transactions before trusting the monthly report.</p>
      </header>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Merchant</th>
            <th>Expense Category</th>
            <th>Spend Category</th>
            <th>Status</th>
          </tr>
        </thead>
      </table>
    </section>
  );
}
```

- [ ] **Step 4: Run the frontend page tests**

Run: `npm --prefix frontend test -- report-home.test.tsx review-queue.test.tsx`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add report, upload, review, and manual entry pages"
```

### Task 9: Add end-to-end coverage, README setup, and full verification commands

**Files:**
- Modify: `README.md`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/tests/e2e/monthly-report.spec.ts`
- Modify: `pyproject.toml`
- Test: `tests/backend/test_auth.py`
- Test: `tests/backend/test_spend_categories.py`
- Test: `tests/backend/test_manual_transactions.py`
- Test: `tests/backend/test_imports.py`
- Test: `tests/backend/test_reports.py`
- Test: `frontend/src/test/app-shell.test.tsx`
- Test: `frontend/src/test/report-home.test.tsx`
- Test: `frontend/src/test/review-queue.test.tsx`
- Test: `frontend/tests/e2e/monthly-report.spec.ts`

- [ ] **Step 1: Write the failing end-to-end smoke test**

```ts
// frontend/tests/e2e/monthly-report.spec.ts
import { expect, test } from "@playwright/test";

test("login, review month, and see monthly report", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("heading", { name: /monthly report/i })).toBeVisible();
  await expect(page.getByText(/month total/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `npm --prefix frontend exec playwright test monthly-report.spec.ts`
Expected: FAIL because the frontend dev server, auth flow, or routes are not yet wired end-to-end.

- [ ] **Step 3: Finish integration wiring and document local setup**

```md
# README.md
## Local setup

1. Install Python dependencies: `uv sync`
2. Install frontend dependencies: `npm --prefix frontend install`
3. Start backend: `uv run uvicorn app.main:app --reload`
4. Start frontend: `npm --prefix frontend run dev`
5. Login with `owner / secret123` or override `EXPENSE_TRACKER_BOOTSTRAP_USERNAME` and `EXPENSE_TRACKER_BOOTSTRAP_PASSWORD`

## Verification

- `pytest`
- `npm --prefix frontend test`
- `npm --prefix frontend exec playwright test`
```

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests/backend"]
pythonpath = ["."]
addopts = "-q"
```

- [ ] **Step 4: Run the full verification suite**

Run: `pytest`
Expected: PASS for backend unit and API tests.

Run: `npm --prefix frontend test`
Expected: PASS for React Testing Library tests.

Run: `npm --prefix frontend exec playwright test`
Expected: PASS for the login -> report smoke test.

- [ ] **Step 5: Commit**

```bash
git add README.md pyproject.toml frontend tests/backend
git commit -m "test: add e2e coverage and setup docs"
```

## Self-Review Checklist

- Spec coverage:
  - Auth: Task 2
  - Spend categories and manual entry: Task 3
  - UPI and credit-card parsing: Task 4
  - Upload/review pipeline, duplicate handling, merchant suggestions: Task 5
  - Monthly reports and month navigation: Task 6
  - Minimalist React UI and report-centric flow: Tasks 7 and 8
  - End-to-end verification and docs: Task 9
- Placeholder scan:
  - No `TBD` or `TODO` placeholders remain in the tasks.
  - Each task lists exact files and concrete commands.
- Type consistency:
  - `expense_category` remains `common | personal`.
  - `review_status` remains `needs_review | reviewed | flagged`.
  - `source_type` remains `manual | upi_pdf | credit_card_pdf`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-expense-tracker.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
