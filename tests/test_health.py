"""Health and root endpoint tests."""


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "mindmitra-backend"


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Welcome to MindMitra API"
    assert data["version"] == "1.0.0"
