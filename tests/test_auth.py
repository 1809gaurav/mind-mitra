
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    from unittest.mock import patch
    with patch("app.main.check_db_health", return_value=True), \
         patch("app.main.check_redis_health", return_value=True):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "connected"
        assert data["redis"] == "connected"


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Welcome to MindMitra API"
    assert data["version"] == "1.0.0"


def test_register_user():
    """Test user registration"""
    user_data = {
        "email": "test@example.com",
        "name": "Test User",
        "password": "testpassword123",
        "role": "user"
    }
    
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["name"] == user_data["name"]
    assert data["role"] == user_data["role"]
    assert "id" in data


def test_register_duplicate_user():
    """Test registering duplicate user"""
    user_data = {
        "email": "duplicate@example.com",
        "name": "Duplicate User",
        "password": "testpassword123",
        "role": "user"
    }
    
    # Register first time
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 200
    
    # Try to register again
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_user():
    """Test user login"""
    # First register a user
    user_data = {
        "email": "login@example.com",
        "name": "Login User",
        "password": "testpassword123",
        "role": "user"
    }
    
    client.post("/api/v1/auth/register", json=user_data)
    
    # Then login
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials():
    """Test login with invalid credentials"""
    login_data = {
        "username": "nonexistent@example.com",
        "password": "wrongpassword"
    }
    
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_protected_endpoint_without_token():
    """Test accessing protected endpoint without token"""
    response = client.get("/api/v1/auth/profile")
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]


def test_protected_endpoint_with_token():
    """Test accessing protected endpoint with valid token"""
    # Register and login to get token
    user_data = {
        "email": "protected@example.com",
        "name": "Protected User",
        "password": "testpassword123",
        "role": "user"
    }
    
    client.post("/api/v1/auth/register", json=user_data)
    
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    
    login_response = client.post("/api/v1/auth/login", data=login_data)
    token = login_response.json()["access_token"]
    
    # Access protected endpoint
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/auth/profile", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["name"] == user_data["name"] 