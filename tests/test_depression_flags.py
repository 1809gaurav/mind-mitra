from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import settings
from app.services.depression_flags import DepressionFlagService


@pytest.fixture
def mock_collections():
    flags_collection = MagicMock()
    flags_collection.insert_one = AsyncMock()
    flags_collection.count_documents = AsyncMock(return_value=0)

    users_collection = MagicMock()
    users_collection.find_one = AsyncMock(return_value=None)
    users_collection.update_one = AsyncMock()

    return flags_collection, users_collection


@pytest.fixture
def service(mock_collections):
    flags_collection, users_collection = mock_collections

    with patch("app.services.depression_flags.get_collection") as get_collection:
        get_collection.side_effect = lambda name: (
            flags_collection if name == "depression_flags" else users_collection
        )
        svc = DepressionFlagService()

    svc.flags_collection = flags_collection
    svc.users_collection = users_collection
    svc.notification_service = MagicMock()
    svc.notification_service.send_depression_threshold_user_email = AsyncMock(return_value=True)
    svc.notification_service.send_depression_threshold_contact_email = AsyncMock(return_value=True)
    return svc


@pytest.mark.asyncio
async def test_non_depression_emotion_does_not_record_flag(service, mock_collections):
    flags_collection, _ = mock_collections

    status = await service.process_emotion(
        user_id="user-1",
        emotion_data={"dominant_emotion": "happy", "confidence": 0.9},
    )

    flags_collection.insert_one.assert_not_called()
    assert status.flag_count == 0
    assert status.threshold_exceeded is False


@pytest.mark.asyncio
async def test_depression_emotion_records_flag(service, mock_collections):
    flags_collection, _ = mock_collections
    flags_collection.count_documents.return_value = 1

    status = await service.process_emotion(
        user_id="user-1",
        emotion_data={"dominant_emotion": "sad", "confidence": 0.9},
        source="test",
    )

    flags_collection.insert_one.assert_called_once()
    inserted_doc = flags_collection.insert_one.call_args[0][0]
    assert inserted_doc["user_id"] == "user-1"
    assert inserted_doc["emotion"] == "sad"
    assert inserted_doc["source"] == "test"
    assert status.flag_count == 1


@pytest.mark.asyncio
async def test_threshold_triggers_user_and_contact_emails(service, mock_collections):
    flags_collection, users_collection = mock_collections
    flags_collection.count_documents.return_value = settings.DEPRESSION_FLAG_THRESHOLD
    users_collection.find_one.return_value = {
        "id": "user-1",
        "email": "user@example.com",
        "name": "Alex",
        "role": "user",
        "is_active": True,
        "emergency_contacts": [
            {
                "name": "Jordan",
                "phone": "1234567890",
                "email": "contact@example.com",
                "relationship": "friend",
            }
        ],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    users_collection.update_one.return_value = MagicMock(modified_count=1)

    await service.process_emotion(
        user_id="user-1",
        emotion_data={"dominant_emotion": "sad", "confidence": 0.95},
    )

    service.notification_service.send_depression_threshold_user_email.assert_called_once()
    service.notification_service.send_depression_threshold_contact_email.assert_called_once()


@pytest.mark.asyncio
async def test_no_duplicate_emails_when_already_notified_in_window(service, mock_collections):
    flags_collection, users_collection = mock_collections
    flags_collection.count_documents.return_value = settings.DEPRESSION_FLAG_THRESHOLD
    users_collection.find_one.return_value = {
        "id": "user-1",
        "email": "user@example.com",
        "name": "Alex",
        "role": "user",
        "is_active": True,
        "emergency_contacts": [],
        "depression_threshold_notified_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    await service.process_emotion(
        user_id="user-1",
        emotion_data={"dominant_emotion": "sad", "confidence": 0.95},
    )

    service.notification_service.send_depression_threshold_user_email.assert_not_called()
    users_collection.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_notification_allowed_after_window_expires(service, mock_collections):
    flags_collection, users_collection = mock_collections
    flags_collection.count_documents.return_value = settings.DEPRESSION_FLAG_THRESHOLD
    users_collection.find_one.return_value = {
        "id": "user-1",
        "email": "user@example.com",
        "name": "Alex",
        "role": "user",
        "is_active": True,
        "emergency_contacts": [],
        "depression_threshold_notified_at": datetime.utcnow() - timedelta(
            hours=settings.DEPRESSION_FLAG_WINDOW_HOURS + 1
        ),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    users_collection.update_one.return_value = MagicMock(modified_count=1)

    await service.process_emotion(
        user_id="user-1",
        emotion_data={"dominant_emotion": "anxious", "confidence": 0.8},
    )

    service.notification_service.send_depression_threshold_user_email.assert_called_once()


@pytest.mark.asyncio
async def test_atomic_claim_prevents_duplicate_send(service, mock_collections):
    flags_collection, users_collection = mock_collections
    flags_collection.count_documents.return_value = settings.DEPRESSION_FLAG_THRESHOLD
    users_collection.find_one.return_value = {
        "id": "user-1",
        "email": "user@example.com",
        "name": "Alex",
        "role": "user",
        "is_active": True,
        "emergency_contacts": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    users_collection.update_one.return_value = MagicMock(modified_count=0)

    await service.process_emotion(
        user_id="user-1",
        emotion_data={"dominant_emotion": "sad", "confidence": 0.95},
    )

    service.notification_service.send_depression_threshold_user_email.assert_not_called()


@pytest.mark.asyncio
async def test_threshold_not_triggered_below_count(service, mock_collections):
    flags_collection, users_collection = mock_collections
    flags_collection.count_documents.return_value = settings.DEPRESSION_FLAG_THRESHOLD - 1

    await service.process_emotion(
        user_id="user-1",
        emotion_data={"dominant_emotion": "sad", "confidence": 0.95},
    )

    service.notification_service.send_depression_threshold_user_email.assert_not_called()
    users_collection.update_one.assert_not_called()
