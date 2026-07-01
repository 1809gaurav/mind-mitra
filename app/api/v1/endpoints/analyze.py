"""
Emotion analysis endpoints for text, audio, and image inputs.

Exposes rate-limited POST routes that use the pre-trained ML models
via the EmotionAnalysisService.  Rate limits are applied per-user and
are controlled by the RATE_LIMIT_PER_MINUTE setting in config.py.
"""

from fastapi import APIRouter, Body, Depends, Request

from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from app.core.middleware import limiter
from app.models.analysis import (
    AudioAnalysisRequest,
    AudioAnalysisResponse,
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    TextAnalysisRequest,
    TextAnalysisResponse,
)
from app.models.user import User
from app.services.emotion_analysis import emotion_service

router = APIRouter()


def get_rate_limit() -> str:
    """Return the per-minute rate-limit string read from app settings."""
    return f"{settings.RATE_LIMIT_PER_MINUTE}/minute"


@router.post(
    "/text",
    summary="Analyze text for emotion detection",
    response_model=TextAnalysisResponse,
    responses={
        200: {"description": "Text emotion analysis result"},
        422: {"description": "Validation error — text must be 1–2000 characters"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(get_rate_limit)
async def analyze_text(
    request: Request,
    payload: TextAnalysisRequest = Body(
        ...,
        example={"text": "I feel really anxious and overwhelmed today."},
    ),
    current_user: User = Depends(get_current_user),
) -> TextAnalysisResponse:
    """Analyze a piece of text to detect emotions and overall sentiment.

    Uses a multilingual XLM-RoBERTa transformer (fine-tuned on Twitter data)
    to classify the input into negative / neutral / positive sentiment and
    identify the dominant emotion label.

    If the ML model is unavailable (e.g. not downloaded yet), the service
    falls back gracefully to a neutral response — no 500 errors.

    Args:
        request:      The raw FastAPI Request object (required by SlowAPI).
        payload:      TextAnalysisRequest with the text to analyze (1–2000 chars).
        current_user: JWT-authenticated user injected by the auth dependency.

    Returns:
        TextAnalysisResponse containing emotions, sentiment, sentiment_score,
        dominant_emotion, and confidence.
    """
    # emotion_service.analyze_text() is synchronous (CPU-bound model inference).
    # At production scale, wrap this in asyncio.to_thread() to avoid
    # blocking FastAPI's async event loop while the model runs.
    return emotion_service.analyze_text(payload.text)


@router.post(
    "/audio",
    summary="Analyze audio for emotion detection",
    response_model=AudioAnalysisResponse,
    responses={
        200: {"description": "Audio analysis emotion result"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(get_rate_limit)
async def analyze_audio(
    request: Request,
    payload: AudioAnalysisRequest = Body(...),
    current_user: User = Depends(get_current_user),
) -> AudioAnalysisResponse:
    """Analyze audio tone for emotion detection.

    Allows a configurable number of requests per minute per user.
    """
    return emotion_service.analyze_audio(payload.audio_data, payload.audio_format)


@router.post(
    "/image",
    summary="Analyze image for facial emotion detection",
    response_model=ImageAnalysisResponse,
    responses={
        200: {"description": "Image analysis emotion result"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(get_rate_limit)
async def analyze_image(
    request: Request,
    payload: ImageAnalysisRequest = Body(...),
    current_user: User = Depends(get_current_user),
) -> ImageAnalysisResponse:
    """Analyze facial expressions from image for emotion detection.

    Allows a configurable number of requests per minute per user.
    """
    return emotion_service.analyze_image(payload.image_data, payload.image_format)
