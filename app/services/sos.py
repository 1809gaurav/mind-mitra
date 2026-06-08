from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import uuid

from app.models.sos import SOSAlert, SOSAlertCreate, AlertStatus, AlertSeverity
from app.models.user import User, EmergencyContact
from app.core.database import get_collection
from app.core.config import settings
from app.core.logging import get_logger
from app.services.notifications import notification_service

logger = get_logger("sos")


class SOSService:
    """SOS alert service for emergency notifications"""

    def __init__(self) -> None:
        self._alerts = None
        self._users = None

    @property
    def alerts_collection(self):
        if self._alerts is None:
            self._alerts = get_collection("sos_alerts")
        return self._alerts

    @property
    def users_collection(self):
        if self._users is None:
            self._users = get_collection("users")
        return self._users

    async def create_alert(self, user_id: str, alert_data: SOSAlertCreate) -> Optional[SOSAlert]:
        """Create a new SOS alert and send notifications."""
        try:
            if await self._has_recent_alert(user_id):
                logger.warning(f"User {user_id} has recent alert, cooldown active")
                return None

            alert_id = str(uuid.uuid4())
            now = datetime.utcnow()

            alert_doc = {
                "id": alert_id,
                "user_id": user_id,
                "trigger_type": alert_data.trigger_type,
                "severity": alert_data.severity,
                "reason": alert_data.reason,
                "emotion_data": alert_data.emotion_data,
                "status": AlertStatus.PENDING,
                "created_at": now,
                "updated_at": now,
                "sent_at": None,
                "acknowledged_at": None,
            }

            result = await self.alerts_collection.insert_one(alert_doc)
            if result.inserted_id:
                alert = SOSAlert(**alert_doc)
                await self._send_notifications(alert)
                return alert

            return None

        except Exception as e:
            logger.error(f"Error creating SOS alert: {e}")
            return None

    async def get_user_alerts(
        self, user_id: str, page: int = 1, size: int = 20
    ) -> List[SOSAlert]:
        """Get paginated SOS alerts for a user."""
        try:
            skip = (page - 1) * size
            cursor = (
                self.alerts_collection.find({"user_id": user_id})
                .sort("created_at", -1)
                .skip(skip)
                .limit(size)
            )

            alerts: List[SOSAlert] = []
            async for doc in cursor:
                alerts.append(SOSAlert(**doc))
            return alerts

        except Exception as e:
            logger.error(f"Error getting user alerts: {e}")
            return []

    async def cancel_alert(self, alert_id: str, user_id: str) -> bool:
        """Cancel a pending SOS alert."""
        try:
            result = await self.alerts_collection.update_one(
                {
                    "id": alert_id,
                    "user_id": user_id,
                    "status": AlertStatus.PENDING,
                },
                {
                    "$set": {
                        "status": AlertStatus.CANCELLED,
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            return result.modified_count > 0

        except Exception as e:
            logger.error(f"Error cancelling alert: {e}")
            return False

    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an SOS alert (for emergency contacts)."""
        try:
            result = await self.alerts_collection.update_one(
                {"id": alert_id, "status": AlertStatus.SENT},
                {
                    "$set": {
                        "status": AlertStatus.ACKNOWLEDGED,
                        "acknowledged_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            return result.modified_count > 0

        except Exception as e:
            logger.error(f"Error acknowledging alert: {e}")
            return False

    async def get_cooldown_status(self, user_id: str) -> Dict[str, Any]:
        """Return cooldown state for the user's SOS button.

        Returns dict with:
            active (bool): whether cooldown is currently active
            remaining_seconds (int): seconds remaining (0 if inactive)
            last_alert_at (str|None): ISO timestamp of last alert
        """
        try:
            last_alert = await self.alerts_collection.find_one(
                {
                    "user_id": user_id,
                    "status": {
                        "$in": [
                            AlertStatus.PENDING,
                            AlertStatus.SENT,
                            AlertStatus.ACKNOWLEDGED,
                        ]
                    },
                },
                sort=[("created_at", -1)],
            )

            if last_alert is None:
                return {"active": False, "remaining_seconds": 0, "last_alert_at": None}

            created_at = last_alert["created_at"]
            cooldown_end = created_at + timedelta(minutes=settings.SOS_COOLDOWN_MINUTES)
            now = datetime.utcnow()

            if now < cooldown_end:
                remaining = int((cooldown_end - now).total_seconds())
                return {
                    "active": True,
                    "remaining_seconds": remaining,
                    "last_alert_at": created_at.isoformat(),
                }

            return {
                "active": False,
                "remaining_seconds": 0,
                "last_alert_at": created_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error getting cooldown status: {e}")
            return {"active": False, "remaining_seconds": 0, "last_alert_at": None}

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _has_recent_alert(self, user_id: str) -> bool:
        """Check if user has a recent SOS alert (cooldown)."""
        try:
            cooldown_time = datetime.utcnow() - timedelta(
                minutes=settings.SOS_COOLDOWN_MINUTES
            )
            recent_alert = await self.alerts_collection.find_one(
                {
                    "user_id": user_id,
                    "created_at": {"$gte": cooldown_time},
                    "status": {"$in": [AlertStatus.PENDING, AlertStatus.SENT]},
                }
            )
            return recent_alert is not None

        except Exception as e:
            logger.error(f"Error checking recent alerts: {e}")
            return False

    async def _send_notifications(self, alert: SOSAlert) -> None:
        """Send notifications for an SOS alert."""
        try:
            user_doc = await self.users_collection.find_one({"id": alert.user_id})
            if not user_doc:
                logger.error(f"User not found for alert: {alert.user_id}")
                return

            user = User(**user_doc)

            await self.alerts_collection.update_one(
                {"id": alert.id},
                {
                    "$set": {
                        "status": AlertStatus.SENT,
                        "sent_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                    }
                },
            )

            for contact in user.emergency_contacts:
                await self._send_contact_notification(alert, user, contact)

            await self._send_user_notification(alert, user)
            logger.info(f"SOS notifications sent for alert {alert.id}")

        except Exception as e:
            logger.error(f"Error sending SOS notifications: {e}")

    async def _send_contact_notification(
        self, alert: SOSAlert, user: User, contact: EmergencyContact
    ) -> None:
        """Send SMS + email notification to an emergency contact."""
        try:
            message = f"URGENT: {user.name} has triggered an SOS alert. "
            message += f"Severity: {alert.severity.value}. "
            if alert.reason:
                message += f"Reason: {alert.reason}. "
            message += "Please check on them immediately."

            if contact.phone:
                await notification_service.send_sms(to=contact.phone, message=message)

            if contact.email:
                await notification_service.send_email(
                    to=contact.email,
                    subject=f"URGENT: {user.name} SOS Alert",
                    message=message,
                )

        except Exception as e:
            logger.error(f"Error sending contact notification: {e}")

    async def _send_user_notification(self, alert: SOSAlert, user: User) -> None:
        """Send confirmation notification to the user."""
        try:
            message = (
                "Your SOS alert has been sent to your emergency contacts. "
                "Help is on the way. Please stay safe."
            )
            await notification_service.send_push_notification(
                user_id=user.id,
                title="SOS Alert Sent",
                message=message,
            )

        except Exception as e:
            logger.error(f"Error sending user notification: {e}")

    async def _get_recent_emotion_data(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent emotion data from journal entries (last 24 hours)."""
        try:
            yesterday = datetime.utcnow() - timedelta(days=1)
            journal_collection = get_collection("journal_entries")
            cursor = journal_collection.find(
                {"user_id": user_id, "created_at": {"$gte": yesterday}}
            ).sort("created_at", -1)

            entries: List[Dict[str, Any]] = []
            async for doc in cursor:
                entries.append(
                    {
                        "dominant_emotion": (
                            doc.get("emotion_labels", [{}])[0].get("label", "neutral")
                            if doc.get("emotion_labels")
                            else "neutral"
                        ),
                        "mood_score": doc.get("mood_score", 0.5),
                    }
                )
            return entries

        except Exception as e:
            logger.error(f"Error getting recent emotion data: {e}")
            return []


# Global SOS service instance
sos_service = SOSService()