import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import uuid

from app.main import app
from app.core.database import get_collection

@pytest.fixture(scope="module")
def client():
    """Module-scoped TestClient to keep the event loop and database connection alive across all tests"""
    with TestClient(app) as c:
        yield c

def test_journal_crud_flow(client):
    # 1. Register a test user
    email = f"test_journal_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": email,
        "name": "Journal Test User",
        "password": "testpassword123",
        "role": "user"
    }
    reg_resp = client.post("/api/v1/auth/register", json=user_data)
    assert reg_resp.status_code == 200
    
    # 2. Login to get token
    login_data = {
        "username": email,
        "password": "testpassword123"
    }
    login_resp = client.post("/api/v1/auth/login", data=login_data)
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Register a second user to test access control
    email_2 = f"test_journal_other_{uuid.uuid4().hex[:8]}@example.com"
    user_data_2 = {
        "email": email_2,
        "name": "Other Test User",
        "password": "testpassword123",
        "role": "user"
    }
    reg_resp_2 = client.post("/api/v1/auth/register", json=user_data_2)
    assert reg_resp_2.status_code == 200
    
    login_data_2 = {
        "username": email_2,
        "password": "testpassword123"
    }
    login_resp_2 = client.post("/api/v1/auth/login", data=login_data_2)
    assert login_resp_2.status_code == 200
    token_2 = login_resp_2.json()["access_token"]
    headers_2 = {"Authorization": f"Bearer {token_2}"}

    # 3. Create a journal entry
    entry_data = {
        "mood": 4,
        "text": "<p>Today was a good day.</p>",
        "date": datetime.utcnow().isoformat()
    }
    
    response = client.post("/api/v1/journal", json=entry_data, headers=headers)
    assert response.status_code == 200
    created_entry = response.json()
    assert created_entry["mood"] == entry_data["mood"]
    assert created_entry["text"] == entry_data["text"]
    assert "id" in created_entry
    
    entry_id = created_entry["id"]
    
    # 4. Get journal entries
    response = client.get("/api/v1/journal", headers=headers)
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) >= 1
    assert any(e["id"] == entry_id for e in entries)
    
    # 5. Access control check: other user cannot read this entry
    response = client.get("/api/v1/journal", headers=headers_2)
    assert response.status_code == 200
    assert not any(e["id"] == entry_id for e in response.json())
    
    # 6. Update the journal entry
    updated_data = {
        "mood": 5,
        "text": "<p>Today was an amazing day!</p>",
        "date": entry_data["date"]
    }
    
    # Update with owner should succeed
    response = client.put(f"/api/v1/journal/{entry_id}", json=updated_data, headers=headers)
    assert response.status_code == 200
    updated_entry = response.json()
    assert updated_entry["mood"] == 5
    assert updated_entry["text"] == updated_data["text"]
    
    # Update with other user should fail (unauthorized / 456)
    response = client.put(f"/api/v1/journal/{entry_id}", json=updated_data, headers=headers_2)
    assert response.status_code == 404
    
    # 7. Delete the entry with other user should fail (unauthorized / 456)
    response = client.delete(f"/api/v1/journal/{entry_id}", headers=headers_2)
    assert response.status_code == 404
    
    # Delete with owner should succeed
    response = client.delete(f"/api/v1/journal/{entry_id}", headers=headers)
    assert response.status_code == 200
    
    # Confirm deletion
    response = client.get("/api/v1/journal", headers=headers)
    assert response.status_code == 200
    assert not any(e["id"] == entry_id for e in response.json())

def test_journal_date_filtering(client):
    # Register and login test user
    email = f"test_journal_filter_{uuid.uuid4().hex[:8]}@example.com"
    user_data = {
        "email": email,
        "name": "Journal Filter User",
        "password": "testpassword123",
        "role": "user"
    }
    client.post("/api/v1/auth/register", json=user_data)
    
    login_data = {
        "username": email,
        "password": "testpassword123"
    }
    login_resp = client.post("/api/v1/auth/login", data=login_data)
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create an entry from 5 days ago
    past_date = (datetime.utcnow() - timedelta(days=5)).isoformat()
    entry_1 = client.post("/api/v1/journal", json={
        "mood": 3,
        "text": "<p>Past entry</p>",
        "date": past_date
    }, headers=headers).json()
    
    # Create an entry from today
    today_date = datetime.utcnow().isoformat()
    entry_2 = client.post("/api/v1/journal", json={
        "mood": 4,
        "text": "<p>Today's entry</p>",
        "date": today_date
    }, headers=headers).json()
    
    # Filter for entries between 6 days ago and 2 days ago (should only contain entry_1)
    start_filter = (datetime.utcnow() - timedelta(days=6)).date().isoformat()
    end_filter = (datetime.utcnow() - timedelta(days=2)).date().isoformat()
    
    response = client.get(
        f"/api/v1/journal?start_date={start_filter}&end_date={end_filter}",
        headers=headers
    )
    assert response.status_code == 200
    entries = response.json()
    
    assert any(e["id"] == entry_1["id"] for e in entries)
    assert not any(e["id"] == entry_2["id"] for e in entries)
