from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.models.user import User

class TherapistPatientAssignment(BaseModel):
    id: str
    therapist_id: str
    patient_id: str
    assigned_at: datetime
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class PatientSummaryResponse(BaseModel):
    patient_id: str
    patient_name: str
    patient_email: str
    average_mood: Optional[float] = None
    total_journals_last_30_days: int = 0
    total_sos_alerts: int = 0
    recent_mood_trends: List[Dict[str, Any]] = []

class PatientListResponse(BaseModel):
    patients: List[User]
