from datetime import datetime
from typing import List, Optional
import uuid

from app.core.database import get_collection
from app.core.logging import get_logger
from app.models.exercise import Exercise, ExerciseCompletion

logger = get_logger("exercise")


class ExerciseService:
    """Service for managing CBT exercises and completions"""

    @property
    def exercises_collection(self):
        """Get exercises collection dynamically"""
        return get_collection("exercises")

    @property
    def completions_collection(self):
        """Get completions collection dynamically"""
        return get_collection("exercise_completions")

    async def get_all(self) -> List[Exercise]:
        """Retrieve all exercises"""
        try:
            cursor = self.exercises_collection.find({})
            exercises = []
            async for doc in cursor:
                exercises.append(Exercise(**doc))
            return exercises
        except Exception as e:
            logger.error(f"Error fetching all exercises: {e}")
            return []

    async def get_by_id(self, exercise_id: str) -> Optional[Exercise]:
        """Retrieve a specific exercise by ID"""
        try:
            doc = await self.exercises_collection.find_one({"id": exercise_id})
            if doc:
                return Exercise(**doc)
            return None
        except Exception as e:
            logger.error(f"Error fetching exercise by ID {exercise_id}: {e}")
            return None

    async def complete(self, exercise_id: str, user_id: str) -> Optional[ExerciseCompletion]:
        """Record an exercise completion for a user"""
        try:
            # Check if the exercise exists first
            exercise = await self.get_by_id(exercise_id)
            if not exercise:
                logger.warning(f"Attempted to complete non-existent exercise: {exercise_id}")
                return None

            # Check if already completed to ensure idempotency
            existing = await self.completions_collection.find_one({
                "user_id": str(user_id),
                "exercise_id": exercise_id
            })
            if existing:
                return ExerciseCompletion(**existing)

            completion_id = str(uuid.uuid4())
            now = datetime.utcnow()

            completion_doc = {
                "id": completion_id,
                "user_id": str(user_id),
                "exercise_id": exercise_id,
                "completed_at": now
            }

            result = await self.completions_collection.insert_one(completion_doc)
            if result.inserted_id:
                return ExerciseCompletion(**completion_doc)
            return None
        except Exception as e:
            logger.error(f"Error completing exercise {exercise_id} for user {user_id}: {e}")
            return None
