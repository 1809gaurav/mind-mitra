from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_collection
from app.models.chatbot import ChatHistory, ChatMessage, ChatMessageCreate
from app.models.user import User
from app.services.chatbot import chatbot_service, get_ai_response

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


@router.get(
    "/chat/history",
    summary="Retrieve paginated chat history",
    response_model=ChatHistory,
    responses={
        200: {"description": "Paginated list of chat messages, newest first"},
        401: {"description": "Not authenticated"},
        422: {"description": "Validation error — invalid page or size value"},
    },
)
async def get_chat_history(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    size: int = Query(20, ge=1, le=100, description="Messages per page (1–100)"),
    current_user: User = Depends(get_current_user),
) -> ChatHistory:
    """Retrieve the authenticated user's chat history with pagination.

    Messages are returned in reverse-chronological order (newest first),
    so page 1 always shows the most recent conversation.

    This endpoint handles both messages stored by the current endpoint
    (which use MongoDB's ObjectId) and messages stored by the
    ChatbotService (which use UUID-based "id" fields).

    Args:
        page:         Which page of results to return (starts at 1).
        size:         How many messages per page (1–100, defaults to 20).
        current_user: JWT-authenticated user provided by the auth dependency.

    Returns:
        ChatHistory with a paginated list of messages plus total count,
        current page, and page size — everything a frontend needs to
        render a "load more" or numbered pagination control.
    """
    chat_collection = get_collection("chat_history")

    # Count all messages belonging to this user (needed for pagination UI)
    total = await chat_collection.count_documents({"user_id": current_user.id})

    # Delegate the paginated fetch + document normalisation to the service.
    # chatbot_service.get_chat_history() handles the _id→id fallback and
    # missing-field defaults so the endpoint stays clean.
    messages = await chatbot_service.get_chat_history(
        user_id=current_user.id,
        page=page,
        size=size,
    )

    return ChatHistory(messages=messages, total=total, page=page, size=size)