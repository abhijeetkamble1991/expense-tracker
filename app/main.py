from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.imports import router as imports_router
from app.api.routes.months import router as months_router
from app.api.routes.reports import router as reports_router
from app.api.routes.settings import router as settings_router
from app.api.routes.spend_categories import router as spend_categories_router
from app.api.routes.transactions import router as transactions_router
from app.core.config import normalize_cors_allowed_origins, settings
from app.db.session import init_db


@asynccontextmanager
async def init_db_lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


@asynccontextmanager
async def noop_lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield


def create_app(*, auto_init_db: bool = True) -> FastAPI:
    selected_lifespan = init_db_lifespan if auto_init_db else noop_lifespan
    app = FastAPI(title="Expense Tracker API", lifespan=selected_lifespan)
    cors_allowed_origins = normalize_cors_allowed_origins(
        settings.cors_allowed_origins
    )
    if cors_allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    app.include_router(auth_router)
    app.include_router(health_router)
    app.include_router(imports_router)
    app.include_router(months_router)
    app.include_router(reports_router)
    app.include_router(settings_router)
    app.include_router(spend_categories_router)
    app.include_router(transactions_router)
    return app


app = create_app()
