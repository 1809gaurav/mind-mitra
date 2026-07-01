import pytest
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.api.v1.endpoints.exercise import router
from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.database import init_db, close_db
    await init_db()
    yield
    await close_db()

# Create a clean isolated app for testing to avoid importing app.main (which imports broken endpoints)
app = FastAPI(lifespan=lifespan)
app.include_router(router, prefix="/api/v1/exercises")


# Mock user class that matches what the application expects
class MockUser:
    def __init__(self, id="test-user-id-123"):
        self.id = id


async def mock_get_current_user():
    return MockUser(id="test-user-id-123")


@pytest.fixture(autouse=True)
def clean_collections():
    # Override global clean_collections to do nothing for these tests
    yield


@pytest.fixture(autouse=True)
def setup_db():
    # Setup test database connection
    mongo_client = MongoClient(settings.MONGODB_URL)
    db = mongo_client[settings.DATABASE_NAME]

    # Clean collections before test
    db["exercises"].delete_many({})
    db["exercise_completions"].delete_many({})
    try:
        db["exercise_completions"].drop_index("user_id_1_exercise_id_1")
    except Exception:
        pass

    # Insert a dummy test exercise
    test_exercise = {
        "id": "test-exercise-1",
        "title": "Breathing Exercise",
        "description": "A simple breathing exercise.",
        "type": "somatic",
        "steps": ["Step 1", "Step 2"],
        "duration_minutes": 5
    }
    db["exercises"].insert_one(test_exercise)

    yield db

    # Clean collections after test
    db["exercises"].delete_many({})
    db["exercise_completions"].delete_many({})
    mongo_client.close()


def test_get_exercises():
    """Verify that all exercises are returned"""
    with TestClient(app) as client:
        response = client.get("/api/v1/exercises")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == "test-exercise-1"
        assert data[0]["title"] == "Breathing Exercise"


def test_get_exercise():
    """Verify that a specific exercise is returned by ID"""
    with TestClient(app) as client:
        response = client.get("/api/v1/exercises/test-exercise-1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-exercise-1"
        assert data["title"] == "Breathing Exercise"


def test_get_exercise_not_found():
    """Verify that 404 is returned if exercise does not exist"""
    with TestClient(app) as client:
        response = client.get("/api/v1/exercises/non-existent-id")
        assert response.status_code == 404
        assert response.json()["detail"] == "Exercise not found"


def test_complete_authenticated():
    """Verify that an authenticated user can complete an exercise"""
    # Register the dependency override for authenticated user
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        with TestClient(app) as client:
            # First completion request
            response = client.post("/api/v1/exercises/test-exercise-1/complete")
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Exercise marked as completed"
            assert data["completed"] is True

            # Verify in the DB directly that the record was created
            mongo_client = MongoClient(settings.MONGODB_URL)
            db = mongo_client[settings.DATABASE_NAME]
            completion_record = db["exercise_completions"].find_one({
                "user_id": "test-user-id-123",
                "exercise_id": "test-exercise-1"
            })
            assert completion_record is not None
            mongo_client.close()

            # Second completion request (idempotent check)
            response2 = client.post("/api/v1/exercises/test-exercise-1/complete")
            assert response2.status_code == 200
            data2 = response2.json()
            assert data2["message"] == "Exercise marked as completed"
            assert data2["completed"] is True
    finally:
        # Clear override
        app.dependency_overrides.clear()


def test_complete_unauthenticated():
    """Verify that unauthenticated completion is rejected with 401"""
    with TestClient(app) as client:
        response = client.post("/api/v1/exercises/test-exercise-1/complete")
        assert response.status_code == 401
