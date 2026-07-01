from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class ExerciseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    type: str = Field(..., min_length=1, max_length=50)
    steps: List[str] = Field(...)
    duration_minutes: int = Field(..., gt=0)


class ExerciseCreate(ExerciseBase):
    pass


class Exercise(ExerciseBase):
    id: str

    class Config:
        from_attributes = True


class ExerciseCompletion(BaseModel):
    id: str
    user_id: str
    exercise_id: str
    completed_at: datetime

    class Config:
        from_attributes = True
