from collections import defaultdict

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_collection
from app.models.user import User
from bson import ObjectId
from datetime import datetime, timedelta, timezone

from app.services.report_service import ReportService

router = APIRouter()

@router.get(
    '/weekly',
    summary="Send chat message to AI",
    description="This provides the comprehensive report on past 7 days based [emotion_logs], [journals], [chat_history]"
)
async def weekly_endpoint(
    current_user: User = Depends(get_current_user),
):
    report_service = ReportService()
    pdf_path = await report_service.generate_weekly_pdf(user_id=current_user.id)
    
    return FileResponse(
        pdf_path, 
        media_type='application/pdf', 
        filename='weekly_report.pdf'
    )