import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth_router import auth_router
from app.api.router import router
from app.core.db import create_schema, dispose_engine
from app.core.settings import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure relational database schema exists
    try:
        await create_schema()
        logger.info("Database schema verified.")
    except Exception as exc:
        logger.warning("Database schema check warning: %s", exc)

    # Init Qdrant collection (non-fatal if Qdrant not running yet)
    try:
        from app.core.qdrant import ensure_collection
        await ensure_collection()
        logger.info("Qdrant collection verified.")
    except Exception as exc:
        logger.warning("Qdrant init warning (non-fatal): %s", exc)

    yield
    await dispose_engine()


app = FastAPI(
    title="Spendly API",
    description="Personal finance assistant with Multi-modal receipt OCR, LangGraph MCP agent, and Qdrant RAG memory.",
    version="0.3.0",
    lifespan=lifespan,
)

cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
if not cors_origins:
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")
