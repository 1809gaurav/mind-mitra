"""Celery application and periodic tasks for MindMitra."""

from celery import Celery
from celery.schedules import crontab
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("celery")

celery_app = Celery("mindmitra", broker=settings.REDIS_URL)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_backend=settings.REDIS_URL,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "send-mood-reminders": {
            "task": "app.core.celery.send_mood_reminders",
            "schedule": crontab(minute="*"),
        },
    },
)


@celery_app.task(name="app.core.celery.send_mood_reminders", bind=True, max_retries=3)
def send_mood_reminders(self):
    """Check which users have a reminder at the current time and send push notifications."""
    client = None
    try:
        import pymongo

        client = pymongo.MongoClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
        users_col = db["users"]
        tokens_col = db["device_tokens"]

        now = datetime.utcnow()
        current_time = now.strftime("%H:%M")
        current_weekday = now.weekday()  # 0=Monday, 6=Sunday

        query = {
            "reminder_settings.enabled": True,
            "reminder_settings.reminder_time": current_time,
        }

        users_with_reminders = list(users_col.find(query))
        logger.info(
            f"Found {len(users_with_reminders)} users with reminders at {current_time}"
        )

        sent_count = 0
        for user in users_with_reminders:
            reminder = user.get("reminder_settings", {})
            frequency = reminder.get("frequency", "daily")

            if frequency == "weekly" and current_weekday != 0:
                continue

            user_id = user.get("id")
            if not user_id:
                continue

            token_doc = tokens_col.find_one({"user_id": user_id})
            if not token_doc or not token_doc.get("token"):
                logger.warning(f"No device token for user {user_id}, skipping")
                continue

            _send_fcm_notification(
                token=token_doc["token"],
                title="MindMitra Check-in",
                body=f"Hi {user.get('name', 'there')}! How are you feeling today? Take a moment to log your mood.",
                data={"type": "mood_reminder", "user_id": user_id},
            )
            sent_count += 1

        logger.info(f"Sent {sent_count} mood reminders at {current_time}")
        return {"sent": sent_count, "time": current_time}

    except Exception as exc:
        logger.error(f"send_mood_reminders failed: {exc}")
        raise self.retry(exc=exc, countdown=60)
    finally:
        if client:
            client.close()


def _send_fcm_notification(
    token: str, title: str, body: str, data: Optional[dict] = None
):
    """Send an FCM push notification. Falls back to logging if Firebase is not configured."""
    try:
        if not settings.FIREBASE_PROJECT_ID or settings.FIREBASE_PROJECT_ID.startswith(
            "your-"
        ):
            logger.info(f"Firebase not configured, logging notification: {title}")
            logger.info(f"FCM push -> {token[:20]}... | {title}: {body}")
            return True

        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=token,
        )
        response = messaging.send(message)
        logger.info(f"FCM message sent: {response}")
        return True

    except Exception as e:
        logger.error(f"Failed to send FCM notification: {e}")
        return False
