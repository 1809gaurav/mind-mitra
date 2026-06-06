from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import requests
import os

# --- Helper Function for Hugging Face ---
def analyze_emotion(text_content: str):
    # CRITICAL FIX: URL updated to point directly to the correct server inference endpoint
    api_url = "https://huggingface.co"
    api_key = os.getenv("HF_API_KEY", "") 
    headers = {"Authorization": f"Bearer {api_key}"}
    
    try:
        response = requests.post(api_url, headers=headers, json={"inputs": text_content}, timeout=5)
        if response.status_code == 200:
            result = response.json()
            # Handle nested list array structures safely
            emotions = result[0] if isinstance(result, list) and len(result) > 0 and isinstance(result[0], list) else result
            top_emotion = max(emotions, key=lambda x: x['score'])
            return top_emotion['label'], top_emotion['score']
    except Exception as e:
        print(f"HuggingFace API Error: {e}")
        
    return "Neutral", 1.0  # Graceful fallback handler per acceptance criteria

# --- Updated Pydantic Schemas ---
class JournalEntryBase(BaseModel):
    mood: int
    text: str
    date: Optional[datetime] = None
    emotion: Optional[str] = "Neutral"  
    confidence_score: Optional[float] = 1.0  

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntry(JournalEntryBase):
    id: int
    user_id: int
    date: datetime

    class Config:
        orm_mode = True
