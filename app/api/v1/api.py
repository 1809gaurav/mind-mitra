from fastapi import APIRouter
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import journal, chat, emotion, admin, stats, sos, user, therapist, analyze, reports, exercise

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(journal.router, tags=["journal"])
api_router.include_router(stats.router, tags=["stats"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(emotion.router, tags=["emotion"])
api_router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(sos.router, prefix="/sos", tags=["sos"])
api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(therapist.router, prefix="/therapist", tags=["therapist"])
api_router.include_router(reports.router, prefix="/report", tags=["report"])
api_router.include_router(exercise.router, prefix="/exercises", tags=["exercise"])
