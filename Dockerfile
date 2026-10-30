FROM ghcr.io/astral-sh/uv:python3.13-bookworm AS builder

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./

RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app

RUN uv sync --frozen --no-dev
RUN uv pip install --python /app/.venv/bin/python "uvicorn>=0.30.0"

FROM python:3.13-slim AS runtime

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends tini \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* /var/tmp/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

RUN groupadd --system --gid 1001 expense \
    && useradd --system --uid 1001 --gid expense \
    --home-dir /app --no-create-home \
    --shell /usr/sbin/nologin expense

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --chown=expense:expense pyproject.toml uv.lock README.md ./
COPY --chown=expense:expense app ./app

RUN chown -R expense:expense /app \
    && chmod -R 755 /app/.venv \
    && find /app/app -name "*.py" -exec chmod 644 {} \;

EXPOSE 8000

USER expense

ENTRYPOINT ["tini", "--"]

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
