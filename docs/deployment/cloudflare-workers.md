# Cloudflare Workers Deployment

This backend can run on Cloudflare Workers with FastAPI via the ASGI bridge.

## What changed for Workers

- `app/worker.py` is the Workers entrypoint.
- `create_app(auto_init_db=False)` disables schema creation during Worker startup.
- Runtime settings are populated from Worker bindings and secrets on each request.
- PostgreSQL URLs are normalized to SQLAlchemy's `pg8000` driver for a pure-Python connection path.
- In Worker mode, SQLAlchemy uses `NullPool` and disposes the engine after each request.

## Required services

1. A PostgreSQL database.
2. A Cloudflare Hyperdrive binding that points to that database.
3. Worker secrets for JWT/bootstrap credentials.

## Configure Wrangler

Copy [wrangler.toml.example](/Users/akamble/Library/CloudStorage/OneDrive-CaliboInc/Documents/Repos/personal/expense-tracker/wrangler.toml.example) to `wrangler.toml` and fill in your Hyperdrive id.

Set secrets:

```bash
wrangler secret put EXPENSE_TRACKER_JWT_SECRET
wrangler secret put EXPENSE_TRACKER_BOOTSTRAP_PASSWORD
```

Optional secrets/vars:

- `EXPENSE_TRACKER_DATABASE_URL`
  Plaintext database URL. Use this when you are not using encrypted configuration.
- `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED`
  Encrypted database URL token produced by `python -m app.scripts.encrypt_db_url`.
- `EXPENSE_TRACKER_DATABASE_URL_KEY`
  Runtime decryption key for `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED`.
- `EXPENSE_TRACKER_BOOTSTRAP_USERNAME`
- `EXPENSE_TRACKER_ACCESS_TOKEN_MINUTES`

If both database URL variables are present, the encrypted value is used.

## Initialize a new database

Database schema creation is now an explicit admin step. Run it from a machine that can reach Postgres directly:

```bash
export EXPENSE_TRACKER_DATABASE_URL='postgresql+pg8000://postgres:password@db.example.com:5432/postgres?sslmode=require'
python -m app.scripts.init_db
```

For a Hyperdrive-managed database, use the origin PostgreSQL connection string for initialization, not the Worker binding name.

## Encrypt a database URL for Secret Manager

Generate an encrypted token from stdin so the plaintext connection string does not land in shell history:

```bash
printf '%s' 'postgresql+pg8000://postgres:password@db.example.com:5432/postgres?sslmode=require' | \
EXPENSE_TRACKER_DATABASE_URL_KEY='replace-with-a-strong-secret' \
python -m app.scripts.encrypt_db_url
```

Store the output as `EXPENSE_TRACKER_DATABASE_URL_ENCRYPTED` and keep `EXPENSE_TRACKER_DATABASE_URL_KEY` as a separate Worker secret.

## Deploy

Install the Worker tooling and deploy:

```bash
uv sync
uv run pywrangler deploy
```

For local Worker development:

```bash
uv run pywrangler dev
```

If the project does not already include the Python Workers tooling, add it as
development dependencies first:

```bash
uv add --dev workers-py workers-runtime-sdk
```

If you hit `multipart: message too large`, clear the vendored package directory
and let `pywrangler` rebuild it from the current runtime dependency set before
deploying again:

```bash
rm -rf python_modules
uv sync
uv run pywrangler deploy
```

## Notes

- PDF parsing still happens on the request path. That is acceptable for small statements, but larger imports should move to R2 + Queues later.
- This repository still uses `Base.metadata.create_all()` plus lightweight SQLite migrations. Alembic is still recommended for production schema evolution.
