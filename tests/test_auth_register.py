"""Tests for POST /api/v1/auth/register."""


class TestRegister:
    def test_register_success(self, client, user_data):
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["name"] == user_data["name"]
        assert data["role"] == user_data["role"]
        assert data["is_active"] is True
        assert "id" in data
        assert "hashed_password" not in data
        assert "password" not in data

    def test_register_duplicate_email(self, client, registered_user):
        duplicate_payload = {
            "email": registered_user["email"],
            "name": registered_user["name"],
            "password": registered_user["password"],
            "role": registered_user["role"],
        }
        response = client.post("/api/v1/auth/register", json=duplicate_payload)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_invalid_email(self, client, user_data):
        user_data["email"] = "not-an-email"
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 422

    def test_register_password_too_short(self, client, user_data):
        user_data["password"] = "short"
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 422

    def test_register_missing_fields(self, client):
        response = client.post("/api/v1/auth/register", json={})
        assert response.status_code == 422

    def test_register_create_user_failure(self, client, user_data, monkeypatch):
        async def fake_create_user(_user_create):
            return None

        monkeypatch.setattr(
            "app.api.v1.endpoints.auth.auth_service.create_user",
            fake_create_user,
        )

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 500
        assert response.json()["detail"] == "Failed to create user"
