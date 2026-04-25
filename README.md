# Expense Tracker

Monthly expense tracker with a FastAPI backend and a Vite/React frontend.

## Local setup

### Backend

Sync the backend dependencies with `uv`:

```bash
uv sync
```

Start the API:

```bash
uv run uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`.

### Frontend

Install frontend dependencies:

```bash
npm --prefix frontend install
```

Before the first Playwright run on a clean checkout, install the Chromium browser once:

```bash
npm --prefix frontend exec playwright install chromium
```

Start the Vite dev server:

```bash
npm --prefix frontend run dev
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
pytest
```

If you are not already running inside the environment synced by `uv`, use `uv run pytest`.

Frontend RTL:

```bash
npm --prefix frontend test
```

Playwright smoke:

```bash
npm --prefix frontend exec playwright test
```

The Playwright smoke test boots the backend with `uv run uvicorn`, boots the frontend with Vite on port `4173`, signs in with `EXPENSE_TRACKER_BOOTSTRAP_USERNAME` / `EXPENSE_TRACKER_BOOTSTRAP_PASSWORD` when those overrides are set, and otherwise uses the default seeded `owner` / `secret123` credentials.
