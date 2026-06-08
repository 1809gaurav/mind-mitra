import json
from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from redis.exceptions import RedisError

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import get_redis

logger = get_logger("cache")


class _CacheJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


class CacheService:
    """Redis cache wrapper with graceful fallback on connection errors."""

    async def get_json(self, key: str) -> Optional[Any]:
        if not settings.CACHE_ENABLED:
            return None

        client = get_redis()
        if client is None:
            return None

        try:
            value = await client.get(key)
            if value is None:
                logger.info("cache_miss key=%s", key)
                return None
            logger.info("cache_hit key=%s", key)
            return json.loads(value)
        except (RedisError, json.JSONDecodeError) as exc:
            logger.warning("cache_redis_error operation=get key=%s error=%s", key, exc)
            return None

    async def set_json(self, key: str, value: Any, ttl: int) -> None:
        if not settings.CACHE_ENABLED:
            return

        client = get_redis()
        if client is None:
            return

        try:
            payload = json.dumps(value, cls=_CacheJSONEncoder)
            await client.setex(key, ttl, payload)
        except (RedisError, TypeError, ValueError) as exc:
            logger.warning("cache_redis_error operation=set key=%s error=%s", key, exc)

    async def delete(self, key: str) -> None:
        if not settings.CACHE_ENABLED:
            return

        client = get_redis()
        if client is None:
            return

        try:
            await client.delete(key)
            logger.info("cache_invalidate key=%s", key)
        except RedisError as exc:
            logger.warning("cache_redis_error operation=delete key=%s error=%s", key, exc)

    async def delete_pattern(self, pattern: str) -> None:
        if not settings.CACHE_ENABLED:
            return

        client = get_redis()
        if client is None:
            return

        try:
            deleted = 0
            async for key in client.scan_iter(match=pattern, count=100):
                await client.delete(key)
                deleted += 1
            if deleted:
                logger.info("cache_invalidate pattern=%s count=%d", pattern, deleted)
        except RedisError as exc:
            logger.warning(
                "cache_redis_error operation=delete_pattern pattern=%s error=%s",
                pattern,
                exc,
            )


def journal_list_cache_key(user_id: str) -> str:
    return f"mindmitra:journal:list:{user_id}:{settings.CACHE_KEY_VERSION}"


def mood_history_cache_key(user_id: str, days: int) -> str:
    return f"mindmitra:mood:history:{user_id}:days:{days}:{settings.CACHE_KEY_VERSION}"


def journal_list_cache_pattern(user_id: str) -> str:
    return f"mindmitra:journal:list:{user_id}:*"


def mood_history_cache_pattern(user_id: str) -> str:
    return f"mindmitra:mood:history:{user_id}:*"


cache_service = CacheService()
