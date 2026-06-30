"""Tests for POST /api/v1/auth/login."""

from tests.conftest import set_user_active


class TestLogin:
    def test_login_success(self, client, registered_user):
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 30 * 60

    def test_login_wrong_password(self, client, registered_user):
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": "wrongpassword999",
            },
        )
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "wrongpassword",
            },
        )
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_inactive_user(self, client, registered_user):
        set_user_active(registered_user["email"], is_active=False)

        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Inactive user"

    def test_login_missing_credentials(self, client):
        response = client.post("/api/v1/auth/login", data={})
        assert response.status_code == 422
