import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.middleware import limiter
from limits.storage import MemoryStorage

@pytest.fixture(autouse=True)
def reset_limiter():
    limiter._storage = MemoryStorage()
    yield

@pytest.mark.asyncio
async def test_login_rate_limit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as client:
        payload = {"username": "test@example.com", "password": "wrongpass"}
        responses = []
        for _ in range(10):
            r = await client.post("/api/v1/auth/login", data=payload)
            responses.append(r.status_code)
        print(f"Responses: {responses}")
        assert 429 in responses, f"Expected 429 in responses, got: {responses}"

@pytest.mark.asyncio
async def test_register_rate_limit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as client:
        responses = []
        for i in range(10):
            r = await client.post("/api/v1/auth/register", json={
                "email": f"newuser{i}@ratelimitest.com",
                "password": "Test@1234",
                "name": f"User {i}"
            })
            responses.append(r.status_code)
        print(f"Responses: {responses}")
        assert 429 in responses, f"Expected 429 in responses, got: {responses}"

@pytest.mark.asyncio
async def test_refresh_rate_limit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as client:
        responses = []
        for _ in range(15):
            r = await client.post("/api/v1/auth/refresh", json="faketoken")
            responses.append(r.status_code)
        print(f"Responses: {responses}")
        assert 429 in responses, f"Expected 429 in responses, got: {responses}"

@pytest.mark.asyncio
async def test_429_response_structure():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as client:
        payload = {"username": "structure@test.com", "password": "x"}
        r = None
        for _ in range(10):
            r = await client.post("/api/v1/auth/login", data=payload)
            if r.status_code == 429:
                break
        assert r.status_code == 429, f"Expected 429, got {r.status_code}"
        body = r.json()
        assert body["error"] == "rate_limit_exceeded"
        assert "message" in body
        assert "retry_after" in body
        assert "Retry-After" in r.headers
