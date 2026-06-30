import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.database import get_collection
from app.core.logging import get_logger
from app.models.journal import (
    JournalEntry,
    JournalEntryCreate,
    JournalEntryUpdate,
    MoodHistoryPoint,
    MoodHistoryResponse,
)
from app.services.cache import (
    cache_service,
    journal_list_cache_key,
    journal_list_cache_pattern,
    mood_history_cache_key,
    mood_history_cache_pattern,
)

logger = get_logger("journal")


class JournalService:
    """Journal and mood history operations with Redis cache-aside."""

    def __init__(self) -> None:
        self._collection = None

    @property
    def collection(self):
        return get_collection("journal_entries")

    @staticmethod
    def _normalize_mood(doc: Dict[str, Any]) -> float:
        mood = doc.get("mood")
        if mood is not None:
            return float(mood)
        mood_score = doc.get("mood_score")
        if mood_score is not None:
            return float(mood_score)
        return 0.0

    @staticmethod
    def _normalize_text(doc: Dict[str, Any]) -> str:
        return doc.get("text") or doc.get("content") or ""

    @staticmethod
    def _normalize_date(doc: Dict[str, Any]) -> datetime:
        value = doc.get("date") or doc.get("created_at")
        if isinstance(value, datetime):
            return value
        if value is None:
            return datetime.utcnow()
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    def _to_journal_entry(self, doc: Dict[str, Any]) -> JournalEntry:
        return JournalEntry(
            id=str(doc["id"]),
            user_id=str(doc["user_id"]),
            mood=int(round(self._normalize_mood(doc))),
            text=self._normalize_text(doc),
            date=self._normalize_date(doc),
            sleep_hours=doc.get("sleep_hours"),
            sleep_quality=doc.get("sleep_quality"),
            created_at=doc.get("created_at") or self._normalize_date(doc),
            updated_at=doc.get("updated_at"),
            emotion_label=doc.get("emotion_label"),
            emotion_confidence=doc.get("emotion_confidence"),
            emotion_scores=doc.get("emotion_scores"),
            emotion_analyzed=doc.get("emotion_analyzed", False),
        )

    def _serialize_journal_entry(self, entry: JournalEntry) -> Dict[str, Any]:
        return entry.model_dump(mode="json")

    def _serialize_mood_history(self, history: MoodHistoryResponse) -> Dict[str, Any]:
        return history.model_dump(mode="json")

    async def invalidate_user_cache(self, user_id: str) -> None:
        await cache_service.delete_pattern(journal_list_cache_pattern(user_id))
        await cache_service.delete_pattern(mood_history_cache_pattern(user_id))

    async def list_entries(self, user_id: str) -> List[JournalEntry]:
        cache_key = journal_list_cache_key(user_id)
        cached = await cache_service.get_json(cache_key)
        if cached is not None:
            return [JournalEntry(**item) for item in cached]

        cursor = (
            self.collection.find({"user_id": user_id}, {"_id": 0})
            .sort("created_at", -1)
        )
        entries: List[JournalEntry] = []
        async for doc in cursor:
            entries.append(self._to_journal_entry(doc))

        await cache_service.set_json(
            cache_key,
            [self._serialize_journal_entry(entry) for entry in entries],
            settings.CACHE_TTL_JOURNAL_LIST,
        )
        return entries

    async def get_mood_history(self, user_id: str, days: int = 30) -> MoodHistoryResponse:
        days = max(1, min(days, 365))
        cache_key = mood_history_cache_key(user_id, days)
        cached = await cache_service.get_json(cache_key)
        if cached is not None:
            return MoodHistoryResponse(**cached)

        since = datetime.utcnow() - timedelta(days=days)
        cursor = (
            self.collection.find(
                {
                    "user_id": user_id,
                    "$or": [
                        {"created_at": {"$gte": since}},
                        {"date": {"$gte": since}},
                    ],
                },
                {"_id": 0},
            )
            .sort("created_at", -1)
        )

        points: List[MoodHistoryPoint] = []
        sleep_values = []
        async for doc in cursor:
            points.append(
                MoodHistoryPoint(
                    date=self._normalize_date(doc),
                    mood=self._normalize_mood(doc),
                )
            )
            if doc.get("sleep_hours") is not None:
                sleep_values.append(float(doc["sleep_hours"]))

        average_mood = round(sum(point.mood for point in points) / len(points), 2) if points else None
        average_sleep_hours = (round(sum(sleep_values) / len(sleep_values), 2)if sleep_values else None
)
        history = MoodHistoryResponse(
            user_id=user_id,
            period_days=days,
            average_mood=average_mood,
            average_sleep_hours=average_sleep_hours,
            entries=points,
        )
        await cache_service.set_json(
            cache_key,
            self._serialize_mood_history(history),
            settings.CACHE_TTL_MOOD_HISTORY,
        )
        return history

    async def create_entry(self, user_id: str, entry: JournalEntryCreate) -> JournalEntry:
        now = datetime.utcnow()
        created_at = entry.date or now
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "content": entry.text,
            "text": entry.text,
            "mood": entry.mood,
            "mood_score": float(entry.mood),
            "created_at": created_at,
            "updated_at": now,
            "date": created_at,
            "sleep_hours": entry.sleep_hours,
            "sleep_quality": entry.sleep_quality,
        }
        await self.collection.insert_one(doc)
        await self.invalidate_user_cache(user_id)
        return self._to_journal_entry(doc)

    async def update_entry(
        self,
        user_id: str,
        entry_id: str,
        updates: JournalEntryUpdate,
    ) -> Optional[JournalEntry]:
        existing = await self.collection.find_one(
            {"id": entry_id, "user_id": user_id},
            {"_id": 0},
        )
        if existing is None:
            return None

        update_fields: Dict[str, Any] = {"updated_at": datetime.utcnow()}
        if updates.mood is not None:
            update_fields["mood"] = updates.mood
            update_fields["mood_score"] = float(updates.mood)
        if updates.text is not None:
            update_fields["text"] = updates.text
            update_fields["content"] = updates.text
        if updates.date is not None:
            update_fields["date"] = updates.date
            update_fields["created_at"] = updates.date
        if updates.sleep_hours is not None:
            update_fields["sleep_hours"] = updates.sleep_hours
        if updates.sleep_quality is not None:
           update_fields["sleep_quality"] = updates.sleep_quality

        await self.collection.update_one(
            {"id": entry_id, "user_id": user_id},
            {"$set": update_fields},
        )
        updated = await self.collection.find_one(
            {"id": entry_id, "user_id": user_id},
            {"_id": 0},
        )
        await self.invalidate_user_cache(user_id)
        return self._to_journal_entry(updated)

    async def delete_entry(self, user_id: str, entry_id: str) -> bool:
        result = await self.collection.delete_one({"id": entry_id, "user_id": user_id})
        if result.deleted_count:
            await self.invalidate_user_cache(user_id)
            return True
        return False


journal_service = JournalService()
