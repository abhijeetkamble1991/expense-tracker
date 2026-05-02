# Expense Tracker

Monthly expense tracker with a FastAPI backend and a Vite/React frontend.

## Local setup

### Backend

Sync the backend dependencies with `uv`:

```bash
uv sync
```

Create your local environment file:

```bash
cp .env.example .env
```

Initialize the database schema explicitly:

```bash
uv run python -m app.scripts.init_db
```

Start the API:

```bash
uv run uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000`.

### Backend Docker image

Build the backend image:

```bash
docker build -t expense-tracker-backend .
```

Run it locally with your environment file:

```bash
docker run --rm -p 8000:8000 --env-file .env expense-tracker-backend
```

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

- Username: `abhijeet`

You can override the seeded login with `EXPENSE_TRACKER_BOOTSTRAP_USERNAME` and `EXPENSE_TRACKER_BOOTSTRAP_PASSWORD`.

## Encrypted Database URL

The backend supports both plaintext and encrypted database URL configuration:

- `EXPENSE_TRACKER_DATABASE_URL`
- `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED`
- `EXPENSE_TRACKER_DATABASE_URL_KEY`

Resolution order is:

1. If `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED` is set, the backend requires `EXPENSE_TRACKER_DATABASE_URL_KEY`, decrypts the value, and uses that URL.
2. Otherwise it falls back to `EXPENSE_TRACKER_DATABASE_URL`.

When both database URL variables are present, the encrypted value wins.

For Supabase-backed deployments running in Docker or Kubernetes, prefer the Supavisor session pooler connection string on port `5432`. The direct `db.<project-ref>.supabase.co` hostname is IPv6-only by default and often fails from IPv4-only container networks.

Encrypt a database URL from the terminal without putting the plaintext into shell history:

```bash
printf '%s' 'postgresql+pg8000://postgres:password@db.example.com:5432/postgres?sslmode=require' | \
EXPENSE_TRACKER_DATABASE_URL_KEY='replace-with-a-strong-secret' \
python -m app.scripts.encrypt_db_url
```

The command prints a single token that starts with `v1.`. Store that token as `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED` and keep `EXPENSE_TRACKER_DATABASE_URL_KEY` as a separate runtime secret.

Recommended storage model:

- store `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED` in Secret Manager
- store `EXPENSE_TRACKER_DATABASE_URL_KEY` as a separate environment secret
- do not commit either value to the repository

This is reversible encryption, not hashing. Anyone who has both the encrypted value and the key can recover the original database URL.

## Cloudflare Workers

The backend now includes a Cloudflare Workers entrypoint in [worker.py](/Users/akamble/Library/CloudStorage/OneDrive-CaliboInc/Documents/Repos/personal/expense-tracker/app/worker.py).

Deployment notes:

- use Hyperdrive, `EXPENSE_TRACKER_DATABASE_URL`, or `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED`
- initialize the schema separately with `python -m app.scripts.init_db`
- copy [wrangler.toml.example](/Users/akamble/Library/CloudStorage/OneDrive-CaliboInc/Documents/Repos/personal/expense-tracker/wrangler.toml.example) to `wrangler.toml`
- set secrets for `EXPENSE_TRACKER_JWT_SECRET`, `EXPENSE_TRACKER_BOOTSTRAP_PASSWORD`, and `EXPENSE_TRACKER_DATABASE_URL_KEY` when using encrypted DB URLs
- use `uv run pywrangler deploy` so Python dependencies from `pyproject.toml` are bundled into the Worker

Full setup is documented in [docs/deployment/cloudflare-workers.md](/Users/akamble/Library/CloudStorage/OneDrive-CaliboInc/Documents/Repos/personal/expense-tracker/docs/deployment/cloudflare-workers.md).

## Helm Deployment

The repository includes a backend-only Helm chart in [helm/expense-tracker-backend](/Users/akamble/Library/CloudStorage/OneDrive-CaliboInc/Documents/Repos/personal/expense-tracker/helm/expense-tracker-backend).

Before installing, update [helm/expense-tracker-backend/values.yaml](/Users/akamble/Library/CloudStorage/OneDrive-CaliboInc/Documents/Repos/personal/expense-tracker/helm/expense-tracker-backend/values.yaml) with:

- your backend image repository and tag
- `EXPENSE_TRACKER_DATABASE_URL` or the encrypted database URL pair
- `EXPENSE_TRACKER_JWT_SECRET`
- `EXPENSE_TRACKER_BOOTSTRAP_PASSWORD`

If you are using Supabase from Docker or Kubernetes, use the session pooler format:

```yaml
env:
  EXPENSE_TRACKER_DATABASE_URL: "postgresql+pg8000://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:5432/postgres?sslmode=require"
```

Do not use the direct `db.<project-ref>.supabase.co:5432` host unless your runtime has working IPv6 connectivity or your Supabase project has the IPv4 add-on enabled.

Install the chart:

```bash
helm install expense-tracker-backend ./helm/expense-tracker-backend
```

Override values at deploy time when needed:

```bash
helm install expense-tracker-backend ./helm/expense-tracker-backend \
  --set image.repository=ghcr.io/example/expense-tracker-backend \
  --set image.tag=latest \
  --set env.EXPENSE_TRACKER_JWT_SECRET=replace-me \
  --set env.EXPENSE_TRACKER_BOOTSTRAP_PASSWORD=replace-me
```

The chart deploys only the application. It does not create PostgreSQL or any other external services.

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

The Playwright smoke test boots the backend with `uv run uvicorn`, boots the frontend with Vite on port `4173`, and signs in with the configured `EXPENSE_TRACKER_BOOTSTRAP_USERNAME` / `EXPENSE_TRACKER_BOOTSTRAP_PASSWORD` credentials.
