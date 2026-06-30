from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from app.api.v1.endpoints.auth import get_current_admin
from app.core.logging import get_logger
from app.models.user import User
from app.services.admin import admin_service

logger = get_logger("admin_endpoints")

router = APIRouter()


@router.get("/stats", response_model=Dict[str, int])
async def get_stats(
    current_admin: User = Depends(get_current_admin),
) -> Dict[str, int]:
    """
    Return platform-wide statistics.

    - **total_users**: all registered accounts
    - **active_users**: accounts where is_active == True
    - **sos_count**: total SOS alerts ever triggered

    Requires: admin role. Returns 401 if unauthenticated, 403 if not admin.
    """
    return await admin_service.get_platform_stats()


@router.get("/journals", response_model=List[Dict[str, Any]])
async def get_journals(
    limit: int = 10,
    current_admin: User = Depends(get_current_admin),
) -> List[Dict[str, Any]]:
    """
    Return the most recent journal entries across all users, anonymised.

    Fields returned per entry:
    - **anon_user_id**: 8-char salted hash of the real user_id
    - **mood**: numeric mood value
    - **text_excerpt**: first 100 characters of the journal text
    - **created_at**: entry timestamp

    Maximum 50 entries per request. Requires: admin role.
    """
    return await admin_service.get_recent_journals(limit=min(limit, 50))
