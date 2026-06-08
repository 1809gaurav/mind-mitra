from typing import Optional

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("redis")

redis_client: Optional[Redis] = None


async def init_redis() -> None:
    """Initialize Redis connection. Caching is disabled if Redis is unavailable."""
    global redis_client

    if not settings.CACHE_ENABLED:
        logger.info("Cache disabled via CACHE_ENABLED setting")
        return

    try:
        client = Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        await client.ping()
        redis_client = client
        logger.info("Successfully connected to Redis")
    except RedisError as exc:
        redis_client = None
        logger.warning("Redis unavailable — caching disabled, falling back to database: %s", exc)


async def close_redis() -> None:
    """Close Redis connection."""
    global redis_client
    if redis_client is not None:
        await redis_client.aclose()
        redis_client = None
        logger.info("Redis connection closed")


def get_redis() -> Optional[Redis]:
    """Return the shared Redis client, or None if unavailable."""
    return redis_client


async def ping_redis() -> bool:
    """Return True if Redis responds to PING."""
    if redis_client is None:
        return False
    try:
        await redis_client.ping()
        return True
    except RedisError:
        return False
