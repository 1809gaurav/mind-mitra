"""Tests for reminder settings and device token endpoints."""

import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from mongomock_motor import AsyncMongoMockClient

from app.api.v1.endpoints import user as user_endpoints
from app.core import database as db_module
from app.core.config import settings


@asynccontextmanager
async def _test_lifespan(app: FastAPI):
    db_module.client = AsyncMongoMockClient()
    db_module.database = db_module.client[settings.DATABASE_NAME]
    yield
    db_module.client.close()
    db_module.client = None
    db_module.database = None


def create_test_app() -> FastAPI:
    """Minimal app with user routes only — avoids auth/ML imports."""
    app = FastAPI(lifespan=_test_lifespan)
    app.include_router(user_endpoints.router, prefix="/api/v1/user")
    return app


@pytest.fixture(autouse=True)
def clean_db():
    yield
    if db_module.database is not None:
        asyncio.run(db_module.database.users.delete_many({}))
        asyncio.run(db_module.database.device_tokens.delete_many({}))


@pytest.fixture
def app():
    return create_test_app()


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


def _make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": email,
        "user_id": user_id,
        "role": "user",
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _insert_user(user_id: str, email: str, name: str = "Test User"):
    asyncio.run(
        db_module.database.users.insert_one(
            {
                "id": user_id,
                "email": email,
                "name": name,
                "hashed_password": "fakehash",
                "role": "user",
                "emergency_contacts": [],
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        )
    )


@pytest.fixture
def user_id():
    return str(uuid.uuid4())


@pytest.fixture
def auth_header(user_id):
    email = f"{user_id[:8]}@example.com"
    _insert_user(user_id, email)
    token = _make_token(user_id, email)
    return {"Authorization": f"Bearer {token}"}


# ── GET /reminder-settings ──────────────────────────────────────────


class TestGetReminderSettings:
    def test_returns_defaults_when_none_saved(self, client, auth_header):
        resp = client.get("/api/v1/user/reminder-settings", headers=auth_header)
        assert resp.status_code == 200
        body = resp.json()
        assert body["reminder_time"] == "09:00"
        assert body["frequency"] == "daily"
        assert body["enabled"] is True

    def test_returns_saved_settings(self, client, auth_header):
        client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "18:30", "frequency": "weekly", "enabled": False},
            headers=auth_header,
        )
        resp = client.get("/api/v1/user/reminder-settings", headers=auth_header)
        assert resp.status_code == 200
        body = resp.json()
        assert body["reminder_time"] == "18:30"
        assert body["frequency"] == "weekly"
        assert body["enabled"] is False

    def test_requires_auth(self, client):
        resp = client.get("/api/v1/user/reminder-settings")
        assert resp.status_code in (401, 403)


# ── POST /reminder-settings ─────────────────────────────────────────


class TestPostReminderSettings:
    def test_create_settings(self, client, auth_header):
        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "07:00", "frequency": "daily", "enabled": True},
            headers=auth_header,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["reminder_time"] == "07:00"
        assert body["frequency"] == "daily"
        assert body["enabled"] is True

    def test_update_settings(self, client, auth_header):
        client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "07:00"},
            headers=auth_header,
        )
        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "20:00", "enabled": False},
            headers=auth_header,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["reminder_time"] == "20:00"
        assert body["enabled"] is False

    def test_partial_update_preserves_other_fields(self, client, auth_header):
        client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "10:00", "frequency": "weekly", "enabled": True},
            headers=auth_header,
        )
        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={"enabled": False},
            headers=auth_header,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["reminder_time"] == "10:00"
        assert body["frequency"] == "weekly"
        assert body["enabled"] is False

    def test_rejects_invalid_time_format(self, client, auth_header):
        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "25:00"},
            headers=auth_header,
        )
        assert resp.status_code == 422

        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "9:00"},
            headers=auth_header,
        )
        assert resp.status_code == 422

    def test_rejects_invalid_frequency(self, client, auth_header):
        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={"frequency": "monthly"},
            headers=auth_header,
        )
        assert resp.status_code == 422

    def test_rejects_empty_body(self, client, auth_header):
        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={},
            headers=auth_header,
        )
        assert resp.status_code == 422

    def test_requires_auth(self, client):
        resp = client.post(
            "/api/v1/user/reminder-settings",
            json={"reminder_time": "09:00"},
        )
        assert resp.status_code in (401, 403)


# ── POST /device-token ──────────────────────────────────────────────


class TestDeviceToken:
    def test_store_device_token(self, client, auth_header):
        resp = client.post(
            "/api/v1/user/device-token",
            json={"token": "fcm-token-abc123", "platform": "android"},
            headers=auth_header,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Device token stored successfully."

    def test_upsert_device_token(self, client, auth_header):
        client.post(
            "/api/v1/user/device-token",
            json={"token": "token-v1", "platform": "android"},
            headers=auth_header,
        )
        resp = client.post(
            "/api/v1/user/device-token",
            json={"token": "token-v2", "platform": "ios"},
            headers=auth_header,
        )
        assert resp.status_code == 200

        tokens = db_module.database.device_tokens
        count = asyncio.run(tokens.count_documents({}))
        assert count == 1
        doc = asyncio.run(tokens.find_one({}))
        assert doc["token"] == "token-v2"
        assert doc["platform"] == "ios"

    def test_requires_auth(self, client):
        resp = client.post(
            "/api/v1/user/device-token",
            json={"token": "abc", "platform": "android"},
        )
        assert resp.status_code in (401, 403)


# ── Pydantic model validation ──────────────────────────────────────


class TestModels:
    def test_valid_reminder_settings(self):
        from app.models.user import UserReminderSettings

        s = UserReminderSettings(
            reminder_time="14:30", frequency="weekly", enabled=False
        )
        assert s.reminder_time == "14:30"
        assert s.frequency.value == "weekly"
        assert s.enabled is False

    def test_invalid_time_rejected(self):
        from app.models.user import UserReminderSettings
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            UserReminderSettings(reminder_time="9:00")

        with pytest.raises(ValidationError):
            UserReminderSettings(reminder_time="25:00")

        with pytest.raises(ValidationError):
            UserReminderSettings(reminder_time="12:60")

        with pytest.raises(ValidationError):
            UserReminderSettings(reminder_time="abc")

    def test_invalid_frequency_rejected(self):
        from app.models.user import UserReminderSettings
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            UserReminderSettings(frequency="monthly")

    def test_optional_update_fields(self):
        from app.models.user import UserReminderSettingsUpdate

        u = UserReminderSettingsUpdate(enabled=False)
        assert u.enabled is False
        assert u.reminder_time is None
        assert u.frequency is None
