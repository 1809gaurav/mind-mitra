from datetime import datetime, timezone

from app.core.database import get_collection

class EmotionLogService:

    async def save_log(
        self,
        user_id: str,
        source: str,
        dominant_emotion: str,
        emotions: dict,
        sentiment_score: float,
    ):
        collection = get_collection("emotion_logs")

        await collection.insert_one({
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc),
            "source": source,
            "dominant_emotion": dominant_emotion,
            "emotions": emotions,
            "sentiment_score": sentiment_score,
        })


emotion_log_service = EmotionLogService()