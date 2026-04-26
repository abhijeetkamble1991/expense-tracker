# Cloudflare Workers Deployment

This backend can run on Cloudflare Workers with FastAPI via the ASGI bridge.

## What changed for Workers

- `worker.py` is the Workers entrypoint.
- `create_app(auto_init_db=False)` disables schema creation during Worker startup.
- Runtime settings are populated from Worker bindings and secrets on each request.
- PostgreSQL URLs are normalized to SQLAlchemy's `pg8000` driver for a pure-Python connection path.
- In Worker mode, SQLAlchemy uses `NullPool` and disposes the engine after each request.

## Required services

1. A PostgreSQL database.
2. A Cloudflare Hyperdrive binding that points to that database.
3. Worker secrets for JWT/bootstrap credentials.

## Configure Wrangler

Copy [wrangler.toml.example](/Users/akamble/Library/CloudStorage/OneDrive-CaliboInc/Documents/Repos/personal/expense-tracker/.worktrees/workers-migration/wrangler.toml.example) to `wrangler.toml` and fill in your Hyperdrive id.

Set secrets:

```bash
wrangler secret put EXPENSE_TRACKER_JWT_SECRET
wrangler secret put EXPENSE_TRACKER_BOOTSTRAP_PASSWORD
```

Optional secrets/vars:

- `EXPENSE_TRACKER_DATABASE_URL`
  Use this only if you are not using Hyperdrive. Hyperdrive takes precedence when both are present.
- `EXPENSE_TRACKER_BOOTSTRAP_USERNAME`
- `EXPENSE_TRACKER_ACCESS_TOKEN_MINUTES`

## Initialize a new database

Database schema creation is now an explicit admin step. Run it from a machine that can reach Postgres directly:

```bash
export EXPENSE_TRACKER_DATABASE_URL='postgresql+pg8000://postgres:password@db.example.com:5432/postgres?sslmode=require'
python -m app.scripts.init_db
```

For a Hyperdrive-managed database, use the origin PostgreSQL connection string for initialization, not the Worker binding name.

## Deploy

Install the Worker tooling and deploy:

```bash
uv tool install pywrangler
pywrangler deploy
```

For local Worker development:

```bash
pywrangler dev
```

## Notes

- PDF parsing still happens on the request path. That is acceptable for small statements, but larger imports should move to R2 + Queues later.
- This repository still uses `Base.metadata.create_all()` plus lightweight SQLite migrations. Alembic is still recommended for production schema evolution.
