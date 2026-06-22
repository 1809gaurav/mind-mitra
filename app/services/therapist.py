import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from app.core.database import get_collection
from app.core.logging import get_logger
from app.models.therapist import TherapistPatientAssignment, PatientSummaryResponse
from app.models.user import User
from app.services.journal import journal_service
from app.services.sos import sos_service

logger = get_logger("therapist")

class TherapistService:
    def __init__(self):
        self._assignments = None
        self._users = None

    @property
    def assignments_collection(self):
        if self._assignments is None:
            self._assignments = get_collection("therapist_patients")
        return self._assignments

    @property
    def users_collection(self):
        if self._users is None:
            self._users = get_collection("users")
        return self._users

    async def assign_patient(self, therapist_id: str, patient_id: str, notes: Optional[str] = None) -> TherapistPatientAssignment:
        assignment_id = str(uuid.uuid4())
        doc = {
            "id": assignment_id,
            "therapist_id": therapist_id,
            "patient_id": patient_id,
            "assigned_at": datetime.utcnow(),
            "notes": notes
        }
        await self.assignments_collection.insert_one(doc)
        return TherapistPatientAssignment(**doc)

    async def is_assigned(self, therapist_id: str, patient_id: str) -> bool:
        doc = await self.assignments_collection.find_one({
            "therapist_id": therapist_id,
            "patient_id": patient_id
        })
        return doc is not None

    async def get_assigned_patients(self, therapist_id: str) -> List[User]:
        cursor = self.assignments_collection.find({"therapist_id": therapist_id})
        patient_ids = []
        async for doc in cursor:
            patient_ids.append(doc["patient_id"])
            
        if not patient_ids:
            return []
            
        users_cursor = self.users_collection.find({"id": {"$in": patient_ids}})
        patients = []
        async for user_doc in users_cursor:
            patients.append(User(**user_doc))
            
        return patients

    async def get_patient_summary(self, therapist_id: str, patient_id: str) -> Optional[PatientSummaryResponse]:
        if not await self.is_assigned(therapist_id, patient_id):
            return None
            
        user_doc = await self.users_collection.find_one({"id": patient_id})
        if not user_doc:
            return None
            
        user = User(**user_doc)
        
        mood_history = await journal_service.get_mood_history(patient_id, days=30)
        total_journals = len(mood_history.entries)
        
        sos_alerts = await sos_service.get_user_alerts(patient_id, size=100)
        
        mood_trends = [{"date": point.date.isoformat(), "mood": point.mood} for point in mood_history.entries[:14]]
        
        return PatientSummaryResponse(
            patient_id=user.id,
            patient_name=user.name,
            patient_email=user.email,
            average_mood=mood_history.average_mood,
            total_journals_last_30_days=total_journals,
            total_sos_alerts=len(sos_alerts),
            recent_mood_trends=mood_trends
        )

therapist_service = TherapistService()
