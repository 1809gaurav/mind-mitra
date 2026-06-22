import pytest
import uuid
import asyncio
from fastapi import FastAPI
from datetime import datetime

from app.api.v1.endpoints import auth as auth_endpoints
from app.api.v1.endpoints import therapist as therapist_endpoints
from tests.conftest import _test_lifespan
from app.services.therapist import therapist_service
from app.services.journal import journal_service
from app.services.sos import sos_service
from app.models.journal import JournalEntryCreate
from app.models.sos import SOSAlertCreate, AlertSeverity

@pytest.fixture
def app():
    app = FastAPI(lifespan=_test_lifespan)
    app.include_router(auth_endpoints.router, prefix="/api/v1/auth")
    app.include_router(therapist_endpoints.router, prefix="/api/v1/therapist")
    return app

@pytest.fixture
def therapist_user(client):
    user_data = {
        "email": f"therapist-{uuid.uuid4().hex[:8]}@example.com",
        "name": "Dr. Therapist",
        "password": "Test@Pass123",
        "role": "therapist",
    }
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 200
    user_id = response.json()["id"]
    return {**user_data, "id": user_id}

@pytest.fixture
def therapist_tokens(client, therapist_user):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": therapist_user["email"],
            "password": therapist_user["password"],
        },
    )
    assert response.status_code == 200
    return response.json()

@pytest.fixture
def assigned_patient(client, registered_user, therapist_user):
    # Assign the patient to the therapist using the service directly
    asyncio.run(therapist_service.assign_patient(therapist_user["id"], registered_user["id"]))
    return registered_user

def test_get_patients_unauthorized(client, auth_tokens):
    # Regular user trying to access therapist routes
    response = client.get(
        "/api/v1/therapist/patients",
        headers={"Authorization": f"Bearer {auth_tokens['access_token']}"}
    )
    assert response.status_code == 403

def test_get_patients_authorized(client, therapist_tokens, assigned_patient):
    response = client.get(
        "/api/v1/therapist/patients",
        headers={"Authorization": f"Bearer {therapist_tokens['access_token']}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == assigned_patient["id"]

def test_get_patient_summary(client, therapist_tokens, assigned_patient):
    # Create some mock journal and SOS data
    async def setup_data():
        await journal_service.create_entry(
            assigned_patient["id"], 
            JournalEntryCreate(text="Feeling okay", mood=7)
        )
        await sos_service.create_alert(
            assigned_patient["id"],
            SOSAlertCreate(trigger_type="manual", severity=AlertSeverity.HIGH, reason="Panic attack")
        )
    asyncio.run(setup_data())

    response = client.get(
        f"/api/v1/therapist/patients/{assigned_patient['id']}/summary",
        headers={"Authorization": f"Bearer {therapist_tokens['access_token']}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == assigned_patient["id"]
    assert data["average_mood"] == 7.0
    assert data["total_journals_last_30_days"] == 1
    assert data["total_sos_alerts"] == 1
    assert len(data["recent_mood_trends"]) == 1

def test_get_patient_summary_unassigned(client, therapist_tokens, registered_user):
    # Different patient that is NOT assigned
    response = client.get(
        f"/api/v1/therapist/patients/{registered_user['id']}/summary",
        headers={"Authorization": f"Bearer {therapist_tokens['access_token']}"}
    )
    assert response.status_code == 404
