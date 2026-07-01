"""
Tests for GET /api/v1/chat/history

Design decisions
----------------
1. Heavy ML libraries and the missing 'langdetect' package are pre-mocked in
   sys.modules BEFORE any app code is imported.  This keeps the suite fast
   and prevents ImportError in CI environments.

2. The `get_current_user` FastAPI dependency is overridden with a simple async
   function that returns a pre-built fake User.  This decouples these feature
   tests from bcrypt / JWT so they focus purely on the chat history endpoint.

3. Chat messages are inserted directly into the in-memory MongoDB via an async
   helper.  The FAKE_USER.id is used as the user_id so the endpoint can find
   them when querying.

4. A `client_no_auth` fixture (no dependency override) is used for 401 tests
   to verify the endpoint genuinely rejects unauthenticated requests.
"""

import asyncio
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

# ── Step 1: pre-mock heavy / missing libraries ────────────────────────────────
# 'langdetect' is not in requirements.txt but is imported by chatbot.py.
# The ML libraries are mocked to prevent model downloads during tests.
_LIBS_TO_MOCK = [
    "langdetect",          # missing dependency — mock to avoid ImportError
    "torch",
    "transformers",
    "cv2",
    "librosa",
    "soundfile",
    "vaderSentiment",
    "vaderSentiment.vaderSentiment",
]
for _lib in _LIBS_TO_MOCK:
    sys.modules.setdefault(_lib, MagicMock())

# ── Step 2: safe to import app modules now ────────────────────────────────────
from app.api.v1.endpoints import chat as chat_module         # noqa: E402
from app.api.v1.endpoints.auth import get_current_user       # noqa: E402
from app.core import database as db_module                   # noqa: E402
from app.core.config import settings                         # noqa: E402
from app.models.user import User, UserRole                   # noqa: E402
from app.services.chatbot import chatbot_service             # noqa: E402

# ── Step 3: fake user ─────────────────────────────────────────────────────────
# This ID is also used when inserting test messages so the endpoint finds them.
_NOW = datetime.now(timezone.utc)

FAKE_USER = User(
    id="fake-user-id-chat-history-001",
    email="chat_history_test@example.com",
    name="Chat History Test User",
    role=UserRole.USER,
    is_active=True,
    emergency_contacts=[],
    created_at=_NOW,
    updated_at=_NOW,
)


async def _mock_get_current_user() -> User:
    """Dependency override: always return FAKE_USER without touching the DB."""
    return FAKE_USER


# ── Step 4: minimal test-app factory ─────────────────────────────────────────

@asynccontextmanager
async def _test_lifespan(app: FastAPI):
    """Provide an in-memory MongoDB for the duration of a test.

    We also reset the chatbot_service's cached collection handle so it always
    picks up the fresh mock database for each test — the same pattern that
    conftest.py uses for auth_service.
    """
    db_module.client = AsyncMongoMockClient()
    db_module.database = db_module.client[settings.DATABASE_NAME]
    # Reset the cached collection so chatbot_service.chat_collection
    # queries the NEW mock DB, not the one from a previous test.
    chatbot_service._chat_collection = None
    yield
    db_module.client.close()
    db_module.client = None
    db_module.database = None
    chatbot_service._chat_collection = None


def _create_test_app() -> FastAPI:
    """Minimal FastAPI app with only the chat route included."""
    app = FastAPI(lifespan=_test_lifespan)
    # chat_module.router already contains the full /chat and /chat/history paths
    app.include_router(chat_module.router)
    return app


# ── Step 5: DB seeding helper ─────────────────────────────────────────────────

def _insert_messages(user_id: str, pair_count: int = 3) -> int:
    """Insert `pair_count` user-and-bot message pairs into the in-memory DB.

    Uses the same document schema as the legacy chat endpoint (no explicit
    'id' field) so we also exercise the _id-fallback path in get_chat_history.

    Returns:
        Total number of documents inserted (pair_count * 2).
    """
    async def _run() -> None:
        from app.core.database import get_collection
        collection = get_collection("chat_history")
        docs = []
        for i in range(pair_count):
            docs.append({
                "user_id": user_id,
                "content": f"User message number {i}",
                "is_user": True,
                "created_at": datetime.now(timezone.utc),
            })
            docs.append({
                "user_id": user_id,
                "content": f"Bot reply number {i}",
                "is_user": False,
                "created_at": datetime.now(timezone.utc),
            })
        await collection.insert_many(docs)

    asyncio.run(_run())
    return pair_count * 2


# ── Step 6: fixtures ──────────────────────────────────────────────────────────

@pytest.fixture()
def client():
    """TestClient where get_current_user returns FAKE_USER.

    Most tests use this — they're focused on chat history behaviour, not auth.
    """
    app = _create_test_app()
    app.dependency_overrides[get_current_user] = _mock_get_current_user
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def client_no_auth():
    """TestClient WITHOUT the auth override.

    Used exclusively for 401 tests to verify that unauthenticated requests
    are genuinely rejected by the endpoint.
    """
    app = _create_test_app()
    with TestClient(app) as test_client:
        yield test_client


# ── Step 7: test cases ────────────────────────────────────────────────────────

class TestChatHistory:
    """Tests for GET /chat/history."""

    # ── Happy-path tests ──────────────────────────────────────────────────────

    def test_empty_history_for_new_user(self, client):
        """A user with no messages should receive an empty list and total=0."""
        response = client.get("/chat/history")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["messages"] == []
        # Verify the default pagination values are echoed back correctly
        assert data["page"] == 1
        assert data["size"] == 20  # default defined in the endpoint

    def test_inserted_messages_appear_in_history(self, client):
        """After inserting messages they must appear in the history response."""
        total_inserted = _insert_messages(FAKE_USER.id, pair_count=3)

        response = client.get("/chat/history")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == total_inserted
        # Default size is 20; we only inserted 6 so all are returned
        assert len(data["messages"]) == total_inserted

    def test_messages_contain_content_and_is_user_fields(self, client):
        """Each message object must include content, is_user, and created_at."""
        _insert_messages(FAKE_USER.id, pair_count=1)

        data = client.get("/chat/history").json()

        assert len(data["messages"]) > 0
        for msg in data["messages"]:
            assert "content" in msg,     "Message is missing 'content'"
            assert "is_user" in msg,     "Message is missing 'is_user'"
            assert "created_at" in msg,  "Message is missing 'created_at'"

    def test_user_and_bot_messages_have_different_is_user_values(self, client):
        """The is_user flag must distinguish user messages (True) from bot replies (False)."""
        _insert_messages(FAKE_USER.id, pair_count=2)

        data = client.get("/chat/history").json()

        is_user_values = {msg["is_user"] for msg in data["messages"]}
        # We inserted both user and bot messages, so both True and False must appear
        assert True  in is_user_values, "No user messages (is_user=True) found"
        assert False in is_user_values, "No bot messages (is_user=False) found"

    # ── Pagination tests ──────────────────────────────────────────────────────

    def test_size_param_limits_returned_messages(self, client):
        """The 'size' query param must cap the number of messages returned."""
        _insert_messages(FAKE_USER.id, pair_count=5)  # inserts 10 total

        data = client.get("/chat/history?size=3").json()

        assert len(data["messages"]) == 3
        assert data["size"] == 3
        # total always reflects the full count — not just the current page
        assert data["total"] == 10

    def test_page_param_offsets_results(self, client):
        """Page 1 and page 2 must return different, non-overlapping messages."""
        _insert_messages(FAKE_USER.id, pair_count=5)  # 10 messages total

        page1 = client.get("/chat/history?page=1&size=4").json()
        page2 = client.get("/chat/history?page=2&size=4").json()

        assert len(page1["messages"]) == 4
        assert len(page2["messages"]) == 4

        # Extract message contents and check they don't overlap
        page1_contents = {m["content"] for m in page1["messages"]}
        page2_contents = {m["content"] for m in page2["messages"]}
        assert page1_contents.isdisjoint(page2_contents), (
            "Page 1 and page 2 share messages — pagination is broken"
        )

    def test_page_beyond_data_returns_empty_list(self, client):
        """A page number far past the last message should return an empty list."""
        _insert_messages(FAKE_USER.id, pair_count=2)  # 4 messages

        data = client.get("/chat/history?page=99&size=20").json()

        assert data["messages"] == []
        # total must still be correct even when the page is empty
        assert data["total"] == 4

    # ── Response-structure tests ──────────────────────────────────────────────

    def test_response_always_has_required_top_level_fields(self, client):
        """The JSON body must always include messages, total, page, and size."""
        data = client.get("/chat/history").json()

        for field in ("messages", "total", "page", "size"):
            assert field in data, f"Response is missing top-level field: '{field}'"

    # ── Authentication tests ──────────────────────────────────────────────────

    def test_missing_token_returns_401(self, client_no_auth):
        """Requesting history without any Authorization header must return 401."""
        response = client_no_auth.get("/chat/history")
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client_no_auth):
        """A fake Bearer token must be rejected with 401."""
        response = client_no_auth.get(
            "/chat/history",
            headers={"Authorization": "Bearer totally.fake.token"},
        )
        assert response.status_code == 401

    # ── Validation tests ──────────────────────────────────────────────────────

    def test_page_zero_returns_422(self, client):
        """page=0 violates ge=1 and must return HTTP 422 (Unprocessable Entity)."""
        response = client.get("/chat/history?page=0")
        assert response.status_code == 422

    def test_size_zero_returns_422(self, client):
        """size=0 violates ge=1 and must return HTTP 422."""
        response = client.get("/chat/history?size=0")
        assert response.status_code == 422

    def test_size_over_100_returns_422(self, client):
        """size=101 violates le=100 and must return HTTP 422."""
        response = client.get("/chat/history?size=101")
        assert response.status_code == 422

    def test_size_exactly_100_is_accepted(self, client):
        """size=100 is at the upper bound exactly and must be accepted (200)."""
        response = client.get("/chat/history?size=100")
        assert response.status_code == 200

    # ── User-isolation test ───────────────────────────────────────────────────

    def test_only_current_users_messages_are_returned(self, client):
        """Messages belonging to a different user must NOT appear in the response."""
        other_user_id = "other-user-totally-different-id"

        # Seed messages for the OTHER user only
        _insert_messages(other_user_id, pair_count=3)

        # FAKE_USER (the authenticated user) should see zero messages
        data = client.get("/chat/history").json()

        assert data["total"] == 0
        assert data["messages"] == []
