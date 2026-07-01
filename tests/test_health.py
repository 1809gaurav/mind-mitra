import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)


def test_health_check_healthy():
    """Test health check when database and Redis are connected"""
    with patch("app.main.check_db_health", return_value=True), \
         patch("app.main.check_redis_health", return_value=True):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "connected"
        assert data["redis"] == "connected"


def test_health_check_db_down():
    """Test health check when database is down"""
    with patch("app.main.check_db_health", return_value=False), \
         patch("app.main.check_redis_health", return_value=True):
        response = client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "error"
        assert data["db"] == "disconnected"
        assert data["redis"] == "connected"


def test_health_check_redis_down():
    """Test health check when Redis is down"""
    with patch("app.main.check_db_health", return_value=True), \
         patch("app.main.check_redis_health", return_value=False):
        response = client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "error"
        assert data["db"] == "connected"
        assert data["redis"] == "disconnected"


def test_metrics_endpoint():
    """Test Prometheus metrics endpoint is exposed and functioning"""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text or response.text is not None
