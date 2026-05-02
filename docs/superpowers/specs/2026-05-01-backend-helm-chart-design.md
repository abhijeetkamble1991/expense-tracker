# Backend Helm Chart Design

## Goal

Package the FastAPI backend for Kubernetes with a production Dockerfile and a Helm chart that deploys only the application. Runtime configuration must come from chart values, and the chart must not provision PostgreSQL or other backing services.

## Constraints

- The backend listens on port `8000` through `uvicorn`.
- The application already exposes `GET /health` and initializes database metadata plus bootstrap data on startup.
- The chart must be backend-only. Database infrastructure is out of scope.
- Runtime variables use the `EXPENSE_TRACKER_*` naming scheme from `app/core/config.py`.

## Proposed Packaging

### Docker image

- Add a root-level `Dockerfile`.
- Use a Python 3.13 slim base image.
- Install `uv`.
- Copy `pyproject.toml`, `README.md`, and `app/`.
- Install the project into the image with `uv pip`.
- Expose port `8000`.
- Start the backend with `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

This keeps the image focused on the backend only and matches the local development entrypoint documented in the repository.

### Helm chart

- Add `helm/expense-tracker-backend/Chart.yaml`.
- Add a single default `values.yaml` for image, service, ingress, probes, resources, replica count, and environment variables.
- Add templates for:
  - name helpers
  - Kubernetes `Secret` generated from `.Values.env`
  - `Deployment`
  - `Service`
  - optional `Ingress`

### Runtime configuration model

- Store all `EXPENSE_TRACKER_*` values in `values.yaml` under a single `env` map.
- Render that map into a Kubernetes `Secret` using `stringData`.
- Load the secret in the pod with `envFrom`.

This keeps the chart simple and ensures sensitive values such as JWT secrets and database credentials are not placed into a ConfigMap template.

## Operational Defaults

- `replicaCount: 1`
- `ClusterIP` service exposing port `8000`
- readiness and liveness probes against `/health`
- ingress disabled by default
- no persistence, no HPA, no PostgreSQL subchart

## Documentation

- Extend `README.md` with Docker build/run instructions and Helm installation notes.
- Show which values users must provide for database and authentication settings.
