from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.journal import JournalEntry, JournalEntryCreate
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from typing import List
from fastapi.encoders import jsonable_encoder

# Import Redis Caching Helpers
from app.services.cacheService import get_cache, set_cache, clear_cache

def get_db():
    """Stub for SQLAlchemy compatibility in pre-existing journal endpoint"""
    yield None

router = APIRouter()

@router.get(
    '/journal',
    summary="List journal entries",
    description="Returns a list of 'JournalEntry' models for the authenticated user.",
    response_model=List[JournalEntry],
    responses={
        200: {
            "description": "List of journal entries",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "user_id": 1,
                            "mood": 7,
                            "text": "Had a great day at work today!",
                            "date": "2024-06-01T14:30:00Z"
                        },
                        {
                            "id": 2,
                            "user_id": 1,
                            "mood": 5,
                            "text": "Felt a bit stressed about deadlines",
                            "date": "2024-05-31T21:00:00Z"
                        }
                    ]
                }
            }
        }
    }
)
async def get_journal_entries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieve journal entries for the authenticated user.
    No paramteres to be manually entered to send request

    Response model: List['JournalEntry']
    """
    cache_key = f"user:{current_user.id}:journal_list"
    
    # 1. Look for data in Redis cache first
    cached_journals = await get_cache(cache_key)
    if cached_journals:
        return cached_journals

    # 2. Database query fallback
    journals = db.query(JournalEntry).filter(JournalEntry.user_id == current_user.id).order_by(JournalEntry.date.desc()).all()
    
    # 3. Convert SQLAlchemy models to JSON-friendly format and cache (TTL: 1 Hour)
    serialized_journals = jsonable_encoder(journals)
    await set_cache(cache_key, serialized_journals, ttl=3600)
    
    return journals

@router.post(
    '/journal',
    summary="Create a journal entry",
    response_model=JournalEntry,
    responses={
        200: {
            "description": "New journal entry created",
            "content": {
                "application/json": {
                    "example": {
                        "id": 3,
                        "user_id": 1,
                        "mood": 8,
                        "text": "Today was amazing! I accomplished all my goals and felt very productive.",
                        "date": "2024-06-02T18:45:00Z"
                    }
                }
            }
        }
    }
)
async def create_journal_entry(entry: JournalEntryCreate = Body(
    ...,
    examples={
        "example1": {
            "summary": "Create a journal entry",
            "value": {
                "mood": 8,
                "text": "Today was amazing! I accomplished all my goals and felt very productive.",
                "date": "2024-06-02T18:45:00Z"
            }
        },
        "example2": {
            "summary": "Create a journal entry with current time",
            "value": {
                "mood": 6,
                "text": "Had a challenging day but learned something new.",
                "date": None
            }
        }
    }
), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new journal entry for the authenticated user.

     Enter the below paramters to send request
    mood: int
    text: string
    date: Optional[datetime]

    Response model: 'JournalEntry' 
    """
    db_entry = JournalEntry(**entry.dict(), user_id=current_user.id)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    # 4. Invalidate the journal list cache immediately so user doesn't get stale data
    await clear_cache(f"user:{current_user.id}:journal_list")
    
    return db_entry
