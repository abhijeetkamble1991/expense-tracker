# Expense Tracker

Monthly expense tracker with a FastAPI backend and a Vite/React frontend.

## Local setup

### Backend

Use Python 3.14 and a virtual environment at the repo root:

```bash
python3.14 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
```

Start the API:

```bash
python -m uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`.

### Frontend

Enable pnpm via Corepack if it is not already available, then install dependencies:

```bash
corepack enable pnpm
cd frontend
pnpm install
```

Start the Vite dev server:

```bash
pnpm dev -- --host 127.0.0.1 --port 4173
```

The frontend uses a Vite proxy so requests to `/api/*` are forwarded to the backend at `http://127.0.0.1:8000` during local development, preview, and Playwright runs.

### Login

The backend seeds a single local account on first startup:

- Username: `owner`
- Password: `secret123`

You can override these with `EXPENSE_TRACKER_BOOTSTRAP_USERNAME` and `EXPENSE_TRACKER_BOOTSTRAP_PASSWORD`.

## Verification

Backend:

```bash
. .venv/bin/activate
python -m pytest tests/backend -q
```

Frontend RTL:

```bash
cd frontend
pnpm test
```

Playwright smoke:

```bash
. .venv/bin/activate
cd frontend
pnpm test:e2e:smoke
```

The Playwright smoke test boots the backend with `python -m uvicorn`, boots the frontend with Vite on port `4173`, signs in with the seeded `owner` / `secret123` credentials, and verifies the monthly report landing page.
