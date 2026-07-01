"""
Tests for POST /api/v1/analyze/text

Design decisions
----------------
1. Heavy ML libraries (torch, transformers, etc.) are pre-mocked in sys.modules
   BEFORE the app code is imported.  This keeps the test suite fast and avoids
   needing a GPU or a model download during CI.

2. The `get_current_user` FastAPI dependency is overridden with a simple
   async function that returns a pre-built fake User.  This decouples these
   feature tests from the bcrypt / JWT stack so they focus purely on the
   analyze/text endpoint behaviour.

3. A separate `client_no_auth` fixture (no dependency override) is used for
   the 401 tests, so we still verify that the endpoint actually rejects
   unauthenticated requests.
"""

import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

# ── Step 1: pre-mock heavy ML libraries ──────────────────────────────────────
# Python caches imports in sys.modules.  By inserting MagicMock objects here
# BEFORE any app code is imported, the heavy-model initialisation in
# app.services.emotion_analysis never runs.
_HEAVY_LIBS = [
    "torch",
    "transformers",
    "cv2",
    "librosa",
    "soundfile",
    "vaderSentiment",
    "vaderSentiment.vaderSentiment",
]
for _lib in _HEAVY_LIBS:
    # setdefault means: only mock if NOT already imported (avoids clobbering a
    # real import made by an earlier test file in the same pytest session).
    sys.modules.setdefault(_lib, MagicMock())

# ── Step 2: safe to import app modules now ────────────────────────────────────
from app.api.v1.endpoints import analyze as analyze_module   # noqa: E402
from app.api.v1.endpoints.auth import get_current_user       # noqa: E402
from app.core import database as db_module                   # noqa: E402
from app.core.config import settings                         # noqa: E402
from app.models.analysis import EmotionResult, TextAnalysisResponse  # noqa: E402
from app.models.user import User, UserRole                   # noqa: E402

# ── Step 3: a fake user returned by the mocked dependency ────────────────────
# We build one User instance and reuse it across all tests.
# Using a fixed datetime satisfies the required 'created_at'/'updated_at' fields.
_NOW = datetime.now(timezone.utc)

FAKE_USER = User(
    id="fake-user-id-analyze-001",
    email="analyze_test@example.com",
    name="Analyze Test User",
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
    """Spin up an in-memory MongoDB client; tear down afterwards."""
    db_module.client = AsyncMongoMockClient()
    db_module.database = db_module.client[settings.DATABASE_NAME]
    yield
    db_module.client.close()
    db_module.client = None
    db_module.database = None


def _create_test_app() -> FastAPI:
    """Minimal app: auth + analyze routes only (no heavy ML startup)."""
    app = FastAPI(lifespan=_test_lifespan)
    app.include_router(analyze_module.router, prefix="/api/v1/analyze")
    return app


# ── Step 5: fixtures ──────────────────────────────────────────────────────────

@pytest.fixture()
def client():
    """TestClient where get_current_user is overridden with the fake user.

    Most tests use this fixture — they assume the user is already authenticated
    and focus only on the analyse/text endpoint behaviour.
    """
    app = _create_test_app()
    # Override FastAPI's auth dependency with our lightweight mock.
    # This completely bypasses bcrypt, JWT verification, and the database.
    app.dependency_overrides[get_current_user] = _mock_get_current_user
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def client_no_auth():
    """TestClient WITHOUT the auth override.

    Used exclusively for 401 tests so we verify the endpoint genuinely
    rejects unauthenticated requests.
    """
    app = _create_test_app()
    # No dependency_overrides → get_current_user will enforce real auth
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def fake_negative_analysis() -> TextAnalysisResponse:
    """Deterministic TextAnalysisResponse representing negative sentiment."""
    return TextAnalysisResponse(
        emotions=[
            EmotionResult(label="negative", confidence=0.85, score=-0.85),
            EmotionResult(label="neutral",  confidence=0.10, score=0.0),
            EmotionResult(label="positive", confidence=0.05, score=0.05),
        ],
        sentiment="negative",
        sentiment_score=-0.85,
        dominant_emotion="negative",
        confidence=0.85,
    )


@pytest.fixture()
def fake_positive_analysis() -> TextAnalysisResponse:
    """Deterministic TextAnalysisResponse representing positive sentiment."""
    return TextAnalysisResponse(
        emotions=[
            EmotionResult(label="positive", confidence=0.92, score=0.92),
            EmotionResult(label="neutral",  confidence=0.06, score=0.0),
            EmotionResult(label="negative", confidence=0.02, score=-0.02),
        ],
        sentiment="positive",
        sentiment_score=0.92,
        dominant_emotion="positive",
        confidence=0.92,
    )


# ── Step 6: test cases ────────────────────────────────────────────────────────

class TestAnalyzeText:
    """Tests for POST /api/v1/analyze/text."""

    # ── Happy-path tests ──────────────────────────────────────────────────────

    def test_returns_200_for_valid_text(
        self, client, fake_negative_analysis, monkeypatch
    ):
        """Posting valid text with a mocked service should return HTTP 200."""
        # Replace the real ML call with our deterministic fake response.
        # lambda ignores the text argument and always returns fake_negative_analysis.
        monkeypatch.setattr(
            analyze_module.emotion_service,
            "analyze_text",
            lambda _text: fake_negative_analysis,
        )

        response = client.post(
            "/api/v1/analyze/text",
            json={"text": "I feel really anxious and overwhelmed today."},
        )

        assert response.status_code == 200

    def test_negative_sentiment_is_reflected_in_response(
        self, client, fake_negative_analysis, monkeypatch
    ):
        """Service output with negative sentiment must appear verbatim in the response."""
        monkeypatch.setattr(
            analyze_module.emotion_service,
            "analyze_text",
            lambda _text: fake_negative_analysis,
        )

        data = client.post(
            "/api/v1/analyze/text",
            json={"text": "Everything feels hopeless."},
        ).json()

        assert data["sentiment"] == "negative"
        assert data["dominant_emotion"] == "negative"
        # Use pytest.approx when comparing floating-point values to avoid
        # precision failures (e.g. 0.85 stored as 0.8500000238...).
        assert data["confidence"] == pytest.approx(0.85, abs=1e-6)
        assert len(data["emotions"]) == 3

    def test_positive_sentiment_is_reflected_in_response(
        self, client, fake_positive_analysis, monkeypatch
    ):
        """Service output with positive sentiment must appear verbatim in the response."""
        monkeypatch.setattr(
            analyze_module.emotion_service,
            "analyze_text",
            lambda _text: fake_positive_analysis,
        )

        data = client.post(
            "/api/v1/analyze/text",
            json={"text": "I feel amazing and full of joy today!"},
        ).json()

        assert data["sentiment"] == "positive"
        assert data["dominant_emotion"] == "positive"
        assert data["confidence"] == pytest.approx(0.92, abs=1e-6)

    # ── Response-structure tests ──────────────────────────────────────────────

    def test_response_contains_all_required_fields(
        self, client, fake_negative_analysis, monkeypatch
    ):
        """Every field defined in TextAnalysisResponse must be present in the JSON body."""
        monkeypatch.setattr(
            analyze_module.emotion_service,
            "analyze_text",
            lambda _text: fake_negative_analysis,
        )

        data = client.post(
            "/api/v1/analyze/text",
            json={"text": "Feeling sad."},
        ).json()

        required_fields = (
            "emotions",
            "sentiment",
            "sentiment_score",
            "dominant_emotion",
            "confidence",
        )
        for field in required_fields:
            assert field in data, f"Response is missing required field: '{field}'"

    def test_each_emotion_has_label_and_confidence(
        self, client, fake_negative_analysis, monkeypatch
    ):
        """Every item in the 'emotions' list must have a 'label' and a 'confidence'."""
        monkeypatch.setattr(
            analyze_module.emotion_service,
            "analyze_text",
            lambda _text: fake_negative_analysis,
        )

        data = client.post(
            "/api/v1/analyze/text",
            json={"text": "I am struggling."},
        ).json()

        for emotion in data["emotions"]:
            assert "label" in emotion, "Emotion object missing 'label'"
            assert "confidence" in emotion, "Emotion object missing 'confidence'"
            # Confidence is a probability — must be in [0, 1]
            assert 0.0 <= emotion["confidence"] <= 1.0

    # ── Authentication tests ──────────────────────────────────────────────────

    def test_missing_token_returns_401(self, client_no_auth):
        """Posting without any Authorization header must return HTTP 401."""
        response = client_no_auth.post(
            "/api/v1/analyze/text",
            json={"text": "I feel happy today."},
            # Intentionally no headers dict
        )
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client_no_auth):
        """An invalid Bearer token must be rejected with HTTP 401."""
        response = client_no_auth.post(
            "/api/v1/analyze/text",
            json={"text": "I feel happy."},
            headers={"Authorization": "Bearer this.is.not.a.real.token"},
        )
        assert response.status_code == 401

    # ── Input-validation tests ────────────────────────────────────────────────

    def test_empty_text_returns_422(self, client):
        """Empty string violates min_length=1 on TextAnalysisRequest.text (422)."""
        response = client.post(
            "/api/v1/analyze/text",
            json={"text": ""},
        )
        assert response.status_code == 422

    def test_text_over_2000_chars_returns_422(self, client):
        """Text longer than 2000 characters violates max_length=2000 (422)."""
        response = client.post(
            "/api/v1/analyze/text",
            json={"text": "x" * 2001},
        )
        assert response.status_code == 422

    def test_missing_text_field_returns_422(self, client):
        """Omitting the 'text' field entirely must return 422."""
        response = client.post(
            "/api/v1/analyze/text",
            json={},  # no 'text' key at all
        )
        assert response.status_code == 422

    def test_text_at_max_length_is_accepted(
        self, client, fake_negative_analysis, monkeypatch
    ):
        """Text of exactly 2000 characters is within the limit and must succeed (200)."""
        monkeypatch.setattr(
            analyze_module.emotion_service,
            "analyze_text",
            lambda _text: fake_negative_analysis,
        )

        response = client.post(
            "/api/v1/analyze/text",
            json={"text": "a" * 2000},
        )
        assert response.status_code == 200
