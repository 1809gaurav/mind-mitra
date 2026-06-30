"""Live cache test against real Redis + MongoDB (docker-compose services)."""

import asyncio
import time
import uuid

from app.core import database as db_module
from app.core import redis as redis_module
from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.redis import init_redis, close_redis
from app.models.journal import JournalEntryCreate
from app.services.journal import journal_service
from app.services.cache import journal_list_cache_key


async def main() -> None:
    user_id = f"live-test-{uuid.uuid4().hex[:8]}"
    print("=== Live Redis + MongoDB Cache Test ===")
    print(f"MongoDB: {settings.MONGODB_URL}")
    print(f"Redis:   {settings.REDIS_URL}")
    print()

    await init_db()
    await init_redis()

    if redis_module.redis_client is None:
        raise SystemExit("FAIL: Redis not connected")

    await journal_service.create_entry(
        user_id,
        JournalEntryCreate(mood=8, text="Live cache test entry"),
    )

    t0 = time.perf_counter()
    first = await journal_service.list_entries(user_id)
    t1 = time.perf_counter()
    second = await journal_service.list_entries(user_id)
    t2 = time.perf_counter()

    cache_key = journal_list_cache_key(user_id)
    cached_raw = await redis_module.redis_client.get(cache_key)

    print(f"1st GET journal list: {(t1 - t0) * 1000:.2f}ms  entries={len(first)}")
    print(f"2nd GET journal list: {(t2 - t1) * 1000:.2f}ms  entries={len(second)}")
    print(f"Redis key exists:     {cached_raw is not None}")
    print(f"Redis key:            {cache_key}")
    print()

    logs = []
    import logging

    class Capture(logging.Handler):
        def emit(self, record):
            msg = record.getMessage()
            if "cache_" in msg:
                logs.append(msg)

    handler = Capture()
    logging.getLogger("mindmitra.cache").addHandler(handler)
    logging.getLogger("mindmitra.cache").setLevel(logging.INFO)

    await journal_service.list_entries(user_id)
    await journal_service.list_entries(user_id)

    print("Cache log lines:")
    for line in logs[-4:]:
        print(f"  {line}")

    hit = any("cache_hit" in line for line in logs)
    miss = any("cache_miss" in line for line in logs)
    print()
    if cached_raw and len(first) == len(second) == 1:
        print("PASS: Real Redis cache populated and serving journal list")
    else:
        raise SystemExit("FAIL: Cache key missing or unexpected entry count")

    await close_redis()
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
