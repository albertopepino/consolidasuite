from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.api.routes import allocations, analytics, auth, budget, chart_of_accounts, commentary, connectors, dashboard, esg, export, financial_data, fixed_assets, forecasts, hr, intercompany, kpis, leases, legal_entity, reconciliation, scenarios, sites, targets, tax, treasury, upload, workflow
from app.config import settings
from app.database import engine

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    # Verify database connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified")
    except Exception:
        logger.exception("Failed to connect to database on startup")
        raise

    yield

    # Shutdown: dispose engine connections
    await engine.dispose()


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next) -> Response:
    """Add security headers to every response."""
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth.router, prefix="/api")
app.include_router(sites.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(financial_data.router, prefix="/api")
app.include_router(kpis.router, prefix="/api")
app.include_router(budget.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(targets.router, prefix="/api")
app.include_router(chart_of_accounts.router, prefix="/api")
app.include_router(hr.router, prefix="/api")
app.include_router(intercompany.router, prefix="/api")
app.include_router(fixed_assets.router, prefix="/api")
app.include_router(tax.router, prefix="/api")
app.include_router(treasury.router, prefix="/api")
app.include_router(legal_entity.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(commentary.router, prefix="/api")
app.include_router(workflow.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(forecasts.router, prefix="/api")
app.include_router(connectors.router, prefix="/api")
app.include_router(reconciliation.router, prefix="/api")
app.include_router(leases.router, prefix="/api")
app.include_router(esg.router, prefix="/api")
app.include_router(allocations.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "healthy"}


__all__ = ["app"]
