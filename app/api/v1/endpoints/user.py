"""User management API endpoints (emergency contacts, reminders, device tokens)."""

from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_collection
from app.core.logging import get_logger
from app.models.user import (
    DeviceTokenCreate,
    EmergencyContact,
    User,
    UserReminderSettings,
    UserReminderSettingsUpdate,
)

logger = get_logger("user_endpoints")

router = APIRouter()

DEFAULT_REMINDER_SETTINGS = {
    "reminder_time": "09:00",
    "frequency": "daily",
    "enabled": True,
}


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


@router.get(
    "/reminder-settings",
    summary="Get user reminder settings",
    description="Returns the user's reminder settings. Returns defaults if none saved.",
    response_model=UserReminderSettings,
)
async def get_reminder_settings(
    current_user: User = Depends(get_current_user),
):
    """Retrieve the user's reminder settings."""
    users = get_collection("users")
    user_doc = await users.find_one({"id": current_user.id}, {"reminder_settings": 1})

    if not user_doc or "reminder_settings" not in user_doc:
        return UserReminderSettings(**DEFAULT_REMINDER_SETTINGS)

    return UserReminderSettings(**user_doc["reminder_settings"])


@router.post(
    "/reminder-settings",
    summary="Update user reminder settings",
    description="Create or update the user's reminder settings.",
    response_model=UserReminderSettings,
)
async def update_reminder_settings(
    settings: UserReminderSettingsUpdate = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Create or update the user's reminder settings."""
    users = get_collection("users")

    update_fields = settings.model_dump(exclude_unset=True)
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update.",
        )

    existing = await users.find_one({"id": current_user.id}, {"reminder_settings": 1})
    merged = {**DEFAULT_REMINDER_SETTINGS}
    if existing and "reminder_settings" in existing:
        merged.update(existing["reminder_settings"])
    merged.update(update_fields)

    result = await users.update_one(
        {"id": current_user.id},
        {"$set": {"reminder_settings": merged}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserReminderSettings(**merged)


@router.post(
    "/device-token",
    summary="Store FCM device token",
    description="Stores or updates the user's FCM device token for push notifications.",
)
async def store_device_token(
    device_token: DeviceTokenCreate = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Store or update the user's FCM device token."""
    tokens = get_collection("device_tokens")

    await tokens.update_one(
        {"user_id": current_user.id},
        {"$set": device_token.model_dump()},
        upsert=True,
    )

    return {"message": "Device token stored successfully."}
