from fastapi import APIRouter, Depends, Query, Response

from app.api.v1.endpoints.auth import get_current_user
from app.models.journal import MoodHistoryResponse
from app.models.user import User
from app.services.cache import cache_service, mood_history_cache_key
from app.services.journal import journal_service

router = APIRouter()


@router.get(
    "/stats/mood-history",
    summary="Get mood history",
    description="Returns mood history and trend data for the authenticated user. "
    "Responses include an `X-Cache` header (`HIT` or `MISS`) indicating "
    "whether the data was served from Redis.",
    response_model=MoodHistoryResponse,
)
async def get_mood_history(
    response: Response,
    days: int = Query(30, ge=1, le=365, description="Number of days of history to include"),
    current_user: User = Depends(get_current_user),
):
    """Retrieve mood history for charts and trend analysis."""
    # Peek at the cache to determine hit/miss before the service call
    cache_key = mood_history_cache_key(current_user.id, days)
    cached = await cache_service.get_json(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return MoodHistoryResponse(**cached)

    history = await journal_service.get_mood_history(current_user.id, days=days)
    response.headers["X-Cache"] = "MISS"
    return history
