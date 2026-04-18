from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.spend_categories import router as spend_categories_router
from app.api.routes.transactions import router as transactions_router
from app.db.session import init_db


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Expense Tracker API", lifespan=lifespan)
    app.include_router(auth_router)
    app.include_router(health_router)
    app.include_router(spend_categories_router)
    app.include_router(transactions_router)
    return app


app = create_app()
