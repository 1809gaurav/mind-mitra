from fastapi import APIRouter
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import journal, chat, emotion, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(journal.router, tags=["journal"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(emotion.router, tags=["emotion"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])