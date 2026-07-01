from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.exercise import Exercise, ExerciseCompletion
from app.services.exercise import ExerciseService
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User

from pydantic import BaseModel

class ExerciseCompletionResponse(BaseModel):
    message: str
    completed: bool

router = APIRouter()
exercise_service = ExerciseService()


@router.get("", response_model=List[Exercise])
async def get_exercises():
    """Retrieve all CBT exercises"""
    return await exercise_service.get_all()


@router.get("/{id}", response_model=Exercise)
async def get_exercise(id: str):
    """Retrieve a specific CBT exercise by ID"""
    exercise = await exercise_service.get_by_id(id)
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    return exercise


@router.post("/{id}/complete", response_model=ExerciseCompletionResponse)
async def complete_exercise(id: str, current_user: User = Depends(get_current_user)):
    """Mark a CBT exercise as completed for the authenticated user"""
    completion = await exercise_service.complete(id, current_user.id)
    if not completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found or completion failed"
        )
    return {"message": "Exercise marked as completed", "completed": True}
