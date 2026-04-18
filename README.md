# Expense Tracker

Monthly expense tracker with a FastAPI backend and a Vite/React frontend.

## Local setup

### Backend

Use Python 3.14 and a virtual environment at the repo root:

```bash
/opt/homebrew/bin/python3.14 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
```

Start the API:

```bash
python -m uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`.

### Frontend

Install frontend dependencies:

```bash
cd frontend
/Users/akamble/Library/pnpm/pnpm install
```

Start the Vite dev server:

```bash
/Users/akamble/Library/pnpm/pnpm dev -- --host 127.0.0.1 --port 4173
```

The frontend uses a Vite proxy so requests to `/api/*` are forwarded to the backend at `http://127.0.0.1:8000` during local development, preview, and Playwright runs.

## Verification

Frontend RTL:

```bash
cd frontend
/Users/akamble/Library/pnpm/pnpm test -- --runTestsByPath src/test/report-home.test.tsx src/test/review-queue.test.tsx src/test/app-shell.test.tsx
```

Backend auth slice:

```bash
. .venv/bin/activate
python -m pytest tests/backend/test_auth.py -q
```

Playwright smoke:

```bash
. .venv/bin/activate
cd frontend
/Users/akamble/Library/pnpm/pnpm test:e2e:smoke
```

The Playwright smoke test boots the backend with `python -m uvicorn`, boots the frontend with Vite on port `4173`, signs in with the seeded `owner` / `secret123` credentials, and verifies the monthly report landing page.
