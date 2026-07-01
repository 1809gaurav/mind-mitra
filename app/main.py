from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.database import init_db, check_db_health
from app.api.v1.api import api_router
from app.core.logging import setup_logging
from app.core.middleware import RequestLoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    setup_logging()
    await init_db()
    yield
    # Shutdown
    # Cleanup resources if needed


app = FastAPI(
    title="MindMitra API",
    description="AI-powered mental wellness backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(RequestLoggingMiddleware)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Prometheus Metrics
Instrumentator().instrument(app).expose(app)


async def check_redis_health() -> bool:
    """Check Redis connection health"""
    import redis.asyncio as aioredis
    try:
        client = aioredis.from_url(settings.REDIS_URL, socket_timeout=2.0)
        await client.ping()
        await client.aclose()
        return True
    except Exception:
        return False


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to MindMitra API",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check(response: Response):
    """Health check endpoint checking DB and Redis connections"""
    db_ok = await check_db_health()
    redis_ok = await check_redis_health()
    
    is_healthy = db_ok and redis_ok
    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        
    return {
        "status": "ok" if is_healthy else "error",
        "db": "connected" if db_ok else "disconnected",
        "redis": "connected" if redis_ok else "disconnected"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "Something went wrong"
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    ) 