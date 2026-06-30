from datetime import datetime
from typing import Dict, Optional

from pydantic import BaseModel, Field


class EmotionLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")

    user_id: str

    timestamp: datetime = Field(default_factory=datetime.utcnow)

    source: str

    dominant_emotion: str

    emotions: Dict[str, float] = {}

    sentiment_score: float