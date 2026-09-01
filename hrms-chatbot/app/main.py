import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)
            

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting %s — HRMS API base: %s", settings.app_name, settings.hrms_api_base_url)

    # Pre-warm NLP so the first request is instant
    try:
        from app.nlp.entity_extractor import get_entity_extractor
        from app.nlp.intent_classifier import get_intent_classifier
        logger.info("Pre-loading NLP (spaCy + sklearn)…")
        get_entity_extractor()   # loads spaCy en_core_web_sm
        clf = get_intent_classifier()
        clf._load()              # loads sklearn model
        logger.info("NLP ready")
    except Exception as exc:
        logger.warning("NLP pre-load skipped: %s", exc)

    yield
    logger.info("Shutting down")


app = FastAPI(
    title="HRMS Chatbot API",
    version=settings.app_version,
    description=(
        "NLP chatbot layer for the HRMS system. "
        "Intent classification via sklearn TF-IDF + LogisticRegression. "
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes import chatbot  # noqa: E402
app.include_router(chatbot.router, prefix=settings.api_v1_prefix)

# Debug routes — only mounted when DEBUG=true
if settings.debug:
    from app.api.routes import debug  # noqa: E402
    app.include_router(debug.router, prefix=settings.api_v1_prefix)
    logger.info("Debug routes mounted at %s/debug", settings.api_v1_prefix)
                

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {
        "status": "ok",
        "version": settings.app_version,
        "hrms_api": settings.hrms_api_base_url,
    }


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": "HRMS Chatbot", "docs": "/docs"}
