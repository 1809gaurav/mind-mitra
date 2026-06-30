"""Manual integration test for Redis caching using fakeredis + mongomock."""

import time
import uuid
from contextlib import asynccontextmanager

import fakeredis.aioredis
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app.api.v1.endpoints import auth as auth_endpoints
from app.api.v1.endpoints import journal as journal_endpoints
from app.api.v1.endpoints import stats as stats_endpoints
from app.core import database as db_module
from app.core import redis as redis_module
from app.core.config import settings
from app.services.auth import auth_service


def _reset_auth() -> None:
    auth_service._users_collection = None
    auth_service._reset_tokens_collection = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db_module.client = AsyncMongoMockClient()
    db_module.database = db_module.client[settings.DATABASE_NAME]
    redis_module.redis_client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    _reset_auth()
    yield
    if redis_module.redis_client is not None:
        await redis_module.redis_client.aclose()
    redis_module.redis_client = None
    db_module.client.close()
    db_module.client = None
    db_module.database = None
    _reset_auth()


def main() -> None:
    app = FastAPI(lifespan=lifespan)
    app.include_router(auth_endpoints.router, prefix="/api/v1/auth")
    app.include_router(journal_endpoints.router, prefix="/api/v1")
    app.include_router(stats_endpoints.router, prefix="/api/v1")

    email = f"demo-{uuid.uuid4().hex[:6]}@test.com"
    password = "testpassword123"

    with TestClient(app) as client:
        reg = client.post(
            "/api/v1/auth/register",
            json={"email": email, "name": "Demo", "password": password, "role": "user"},
        )
        assert reg.status_code == 200, reg.text

        login = client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": password},
        )
        assert login.status_code == 200, login.text
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        create = client.post(
            "/api/v1/journal",
            json={"mood": 8, "text": "Integration test entry"},
            headers=headers,
        )
        assert create.status_code == 201, create.text

        t0 = time.perf_counter()
        journal_first = client.get("/api/v1/journal", headers=headers)
        t1 = time.perf_counter()
        journal_second = client.get("/api/v1/journal", headers=headers)
        t2 = time.perf_counter()

        h0 = time.perf_counter()
        mood_first = client.get("/api/v1/stats/mood-history?days=30", headers=headers)
        h1 = time.perf_counter()
        mood_second = client.get("/api/v1/stats/mood-history?days=30", headers=headers)
        h2 = time.perf_counter()

        client.post(
            "/api/v1/journal",
            json={"mood": 5, "text": "Second entry"},
            headers=headers,
        )
        journal_after_write = client.get("/api/v1/journal", headers=headers)

        # Redis unavailable fallback (still serves from DB)
        redis_module.redis_client = None
        journal_fallback = client.get("/api/v1/journal", headers=headers)

    assert journal_first.status_code == 200
    assert journal_second.status_code == 200
    assert mood_first.status_code == 200
    assert mood_second.status_code == 200
    assert journal_after_write.status_code == 200
    assert journal_fallback.status_code == 200
    assert len(journal_after_write.json()) == 2
    assert len(journal_fallback.json()) == 2

    print("=== Redis Cache Integration Test ===")
    print(f"Journal list 1st request: {(t1 - t0) * 1000:.2f}ms  entries={len(journal_first.json())}")
    print(f"Journal list 2nd request: {(t2 - t1) * 1000:.2f}ms  (cached)")
    print(
        f"Mood history 1st request: {(h1 - h0) * 1000:.2f}ms  "
        f"avg_mood={mood_first.json()['average_mood']}"
    )
    print(f"Mood history 2nd request: {(h2 - h1) * 1000:.2f}ms  (cached)")
    print(
        f"After POST invalidate:    entries={len(journal_after_write.json())}  "
        f"moods={[e['mood'] for e in journal_after_write.json()]}"
    )
    print(f"Redis down fallback:      entries={len(journal_fallback.json())}  status=200")
    print()
    print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
