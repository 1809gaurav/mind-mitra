from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel
from app.core.database import get_collection
from app.services.chatbot import chatbot_service, get_ai_response
from app.models.chatbot import ChatMessageCreate
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

router = APIRouter()

@router.post(
    '/chat',
    summary="Send chat message to AI",
    response_model=ChatResponse,
    responses={
        200: {
            "description": "AI chat response",
            "content": {
                "application/json": {
                    "example": {
                        "response": "It sounds like your presentation is causing a lot of stress, but preparing gradually can help."
                    }
                }
            }
        }
    }
)
async def chat_endpoint(request: ChatRequest = Body(
    ...,
    example={
        "message": "I'm feeling anxious about my upcoming presentation"
    }
), current_user: User = Depends(get_current_user)):
    """Send a chat message to the AI chatbot and return a generated response.

    Request model: 'ChatRequest'
    message: string

    Response model: 'ChatResponse'
    response: string
    """
    ai_response = get_ai_response(request.message)

    chat_collection = get_collection("chat_history")

    await chat_collection.insert_many([
        {
            "user_id": current_user.id,
            "content": request.message,
            "is_user": True,
            "created_at":datetime.now(timezone.utc)
        },
        {
            "user_id": current_user.id,
            "content": ai_response,
            "is_user": False,
            "created_at":datetime.now(timezone.utc)
        }
    ])

    return ChatResponse(response=ai_response)