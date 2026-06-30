from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DepressionFlag(BaseModel):
    id: str
    user_id: str
    emotion: str
    confidence: float = 0.0
    source: str = "emotion_detection"
    created_at: datetime


class DepressionFlagCreate(BaseModel):
    emotion: str
    confidence: float = 0.0
    source: str = "emotion_detection"


class DepressionFlagStatus(BaseModel):
    flag_count: int
    threshold: int
    threshold_exceeded: bool
    window_hours: int
    notified_in_window: bool = False
    last_notified_at: Optional[datetime] = None
