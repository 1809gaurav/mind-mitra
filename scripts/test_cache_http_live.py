"""HTTP API live test: register, login, journal x2 — real Redis + MongoDB."""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import auth, journal, stats
from app.core.database import close_db, init_db
from app.core.redis import close_redis, init_redis

logging.basicConfig(level=logging.INFO, format="%(name)s - %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    await init_redis()
    yield
    await close_redis()
    await close_db()


def main() -> None:
    app = FastAPI(lifespan=lifespan)
    app.include_router(auth.router, prefix="/api/v1/auth")
    app.include_router(journal.router, prefix="/api/v1")
    app.include_router(stats.router, prefix="/api/v1")

    email = f"live-{uuid.uuid4().hex[:6]}@test.com"
    password = "testpassword123"

    with TestClient(app) as client:
        reg = client.post(
            "/api/v1/auth/register",
            json={"email": email, "name": "Live User", "password": password, "role": "user"},
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
            json={"mood": 7, "text": "HTTP live cache test"},
            headers=headers,
        )
        assert create.status_code == 201, create.text

        t0 = time.perf_counter()
        r1 = client.get("/api/v1/journal", headers=headers)
        t1 = time.perf_counter()
        r2 = client.get("/api/v1/journal", headers=headers)
        t2 = time.perf_counter()

        m1 = client.get("/api/v1/stats/mood-history?days=30", headers=headers)
        m2 = client.get("/api/v1/stats/mood-history?days=30", headers=headers)

    assert r1.status_code == r2.status_code == 200
    assert m1.status_code == m2.status_code == 200

    print("=== HTTP API Live Test (real Redis + MongoDB) ===")
    print(f"Register + login: OK ({email})")
    print(f"Journal 1st GET: {(t1 - t0) * 1000:.1f}ms  entries={len(r1.json())}")
    print(f"Journal 2nd GET: {(t2 - t1) * 1000:.1f}ms  entries={len(r2.json())}  <- should show cache_hit above")
    print(f"Mood history:    avg_mood={m1.json()['average_mood']}")
    print("PASS")


if __name__ == "__main__":
    main()
