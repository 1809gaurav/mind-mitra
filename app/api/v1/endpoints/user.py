"""User management API endpoints (emergency contacts)."""

from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_collection
from app.core.logging import get_logger
from app.models.user import EmergencyContact, User

logger = get_logger("user_endpoints")

router = APIRouter()


@router.get(
    "/contacts",
    summary="Get emergency contacts",
    description="Returns the list of emergency contacts for the authenticated user.",
    response_model=List[EmergencyContact],
)
async def get_emergency_contacts(
    current_user: User = Depends(get_current_user),
):
    """Retrieve the user's emergency contacts."""
    return current_user.emergency_contacts


@router.put(
    "/contacts",
    summary="Set emergency contacts",
    description="Replace the user's emergency contacts list. "
    "Send an empty list to remove all contacts.",
    response_model=List[EmergencyContact],
)
async def update_emergency_contacts(
    contacts: List[EmergencyContact] = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Set or update the user's emergency contacts."""
    users = get_collection("users")

    result = await users.update_one(
        {"id": current_user.id},
        {
            "$set": {
                "emergency_contacts": [c.model_dump() for c in contacts],
            }
        },
    )

    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return contacts
