# Backend Helm Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the FastAPI backend with a production Dockerfile and a backend-only Helm chart that sources runtime environment variables from chart values.

**Architecture:** Keep packaging assets separate from application code by adding a root Dockerfile and a Helm chart under `helm/expense-tracker-backend`. Render all runtime configuration into a Kubernetes Secret and mount it into the backend Deployment with `envFrom`, while exposing the app through a Kubernetes Service and optional Ingress.

**Tech Stack:** Docker, Helm templating, Kubernetes Deployment/Service/Ingress, FastAPI, uvicorn

---

## File Structure

- Create: `Dockerfile`
- Create: `helm/expense-tracker-backend/Chart.yaml`
- Create: `helm/expense-tracker-backend/values.yaml`
- Create: `helm/expense-tracker-backend/templates/_helpers.tpl`
- Create: `helm/expense-tracker-backend/templates/secret.yaml`
- Create: `helm/expense-tracker-backend/templates/deployment.yaml`
- Create: `helm/expense-tracker-backend/templates/service.yaml`
- Create: `helm/expense-tracker-backend/templates/ingress.yaml`
- Modify: `README.md`

### Task 1: Add the backend Dockerfile

**Files:**
- Create: `Dockerfile`
- Modify: `README.md`

- [ ] **Step 1: Add the image build recipe**

Create a Dockerfile that:
- uses `python:3.13-slim`
- installs `uv`
- copies `pyproject.toml`, `README.md`, and `app/`
- installs the project into the image
- exposes `8000`
- starts `uvicorn app.main:app --host 0.0.0.0 --port 8000`

- [ ] **Step 2: Document local image usage**

Add README instructions for:
- `docker build -t expense-tracker-backend .`
- `docker run -p 8000:8000 --env-file .env expense-tracker-backend`

### Task 2: Add the Helm chart

**Files:**
- Create: `helm/expense-tracker-backend/Chart.yaml`
- Create: `helm/expense-tracker-backend/values.yaml`
- Create: `helm/expense-tracker-backend/templates/_helpers.tpl`
- Create: `helm/expense-tracker-backend/templates/secret.yaml`
- Create: `helm/expense-tracker-backend/templates/deployment.yaml`
- Create: `helm/expense-tracker-backend/templates/service.yaml`
- Create: `helm/expense-tracker-backend/templates/ingress.yaml`
- Modify: `README.md`

- [ ] **Step 1: Define chart metadata and defaults**

Add chart metadata and defaults for:
- image repository/tag/pullPolicy
- replicaCount
- service port and type
- ingress toggle and host/path settings
- pod labels/annotations
- resources
- probe tuning
- `env` map containing `EXPENSE_TRACKER_*` keys

- [ ] **Step 2: Add shared helpers**

Create helper templates for chart name, fullname, labels, and selector labels so the Deployment, Service, Secret, and Ingress stay consistent.

- [ ] **Step 3: Add the environment Secret**

Render `.Values.env` to a Secret with `stringData`, quoting values so numeric-looking entries such as token durations stay valid string environment variables.

- [ ] **Step 4: Add the Deployment**

Build a Deployment that:
- references the chart Secret with `envFrom`
- exposes container port `8000`
- sets readiness and liveness probes to `/health`
- supports resource requests/limits, pod annotations, node selectors, tolerations, and affinity

- [ ] **Step 5: Add the Service and optional Ingress**

Expose the backend through a ClusterIP Service and render an Ingress only when enabled.

- [ ] **Step 6: Document Helm installation**

Add README examples for:
- editing `helm/expense-tracker-backend/values.yaml`
- `helm install expense-tracker-backend ./helm/expense-tracker-backend`
- overriding image tag and secret values at deploy time when needed

### Task 3: Verify packaging assets

**Files:**
- Verify: `Dockerfile`
- Verify: `helm/expense-tracker-backend/*`

- [ ] **Step 1: Run backend tests**

Run: `uv run pytest`
Expected: existing backend test suite passes unchanged

- [ ] **Step 2: Try chart rendering if Helm is installed**

Run: `helm template expense-tracker-backend ./helm/expense-tracker-backend`
Expected: manifests render without template errors

- [ ] **Step 3: Report any local tooling gaps**

If Helm is unavailable locally, note that chart rendering could not be executed in this environment and rely on template review plus repository tests.
