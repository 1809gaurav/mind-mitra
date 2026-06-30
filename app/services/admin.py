import hashlib
from typing import Any, Dict, List

from app.core.config import settings
from app.core.database import get_collection
from app.core.logging import get_logger

logger = get_logger("admin")


class AdminService:
    """Service for admin statistics and platform data aggregation."""

    def __init__(self) -> None:
        self._users: Any = None
        self._sos: Any = None
        self._journals: Any = None

    @property
    def users_collection(self):
        if self._users is None:
            self._users = get_collection("users")
        return self._users

    @property
    def sos_collection(self):
        if self._sos is None:
            self._sos = get_collection("sos_alerts")
        return self._sos

    @property
    def journals_collection(self):
        if self._journals is None:
            self._journals = get_collection("journal_entries")
        return self._journals

    async def get_platform_stats(self) -> Dict[str, int]:
        """Return total users, active users (is_active=True), and total SOS count."""
        try:
            total_users = await self.users_collection.count_documents({})
            active_users = await self.users_collection.count_documents({"is_active": True})
            sos_count = await self.sos_collection.count_documents({})
            return {
                "total_users": total_users,
                "active_users": active_users,
                "sos_count": sos_count,
            }
        except Exception as e:
            logger.error(f"Error fetching platform stats: {e}")
            raise

    async def get_recent_journals(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Return the most recent journal entries across all users, anonymised:
        - user_id replaced with an 8-char SHA-256 digest (salted with SECRET_KEY)
        - text truncated to 100 characters
        - no other personally identifiable fields included
        """
        try:
            cursor = (
                self.journals_collection.find({}, {"_id": 0})
                .sort("created_at", -1)
                .limit(limit)
            )

            entries: List[Dict[str, Any]] = []
            async for doc in cursor:
                raw_user_id = str(doc.get("user_id", ""))
                anon_id = hashlib.sha256(
                    f"{raw_user_id}{settings.SECRET_KEY}".encode()
                ).hexdigest()[:8]

                # Support both field naming conventions present in the codebase
                raw_text: str = doc.get("text") or doc.get("content") or ""
                mood = doc.get("mood") if doc.get("mood") is not None else doc.get("mood_score")
                created_at = doc.get("created_at") or doc.get("date")

                entries.append(
                    {
                        "anon_user_id": anon_id,
                        "mood": mood,
                        "text_excerpt": raw_text[:100],
                        "created_at": created_at,
                    }
                )

            return entries
        except Exception as e:
            logger.error(f"Error fetching recent journals: {e}")
            raise


# Global singleton — mirrors pattern used by auth_service and sos_service
admin_service = AdminService()
