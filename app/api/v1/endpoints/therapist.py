from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.api.v1.endpoints.auth import get_current_therapist
from app.models.user import User
from app.models.therapist import PatientSummaryResponse
from app.services.therapist import therapist_service
from app.core.logging import get_logger

logger = get_logger("therapist_endpoints")

router = APIRouter()

@router.get("/patients", response_model=List[User])
async def get_patients(current_therapist: User = Depends(get_current_therapist)):
    """
    Get all patients assigned to the current therapist.
    Requires: therapist role.
    """
    try:
        patients = await therapist_service.get_assigned_patients(current_therapist.id)
        return patients
    except Exception as e:
        logger.error(f"Error getting patients for therapist {current_therapist.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve assigned patients"
        )

@router.get("/patients/{id}/summary", response_model=PatientSummaryResponse)
async def get_patient_summary(id: str, current_therapist: User = Depends(get_current_therapist)):
    """
    Get aggregated summary (mood trends, journals, SOS) for an assigned patient.
    Requires: therapist role, and the patient must be assigned to this therapist.
    """
    try:
        summary = await therapist_service.get_patient_summary(current_therapist.id, id)
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found or not assigned to you"
            )
        return summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient summary for {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve patient summary"
        )
