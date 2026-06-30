"""Tests for POST /api/v1/auth/refresh."""

from tests.conftest import make_expired_refresh_token, set_user_active


class TestRefreshToken:
    def test_refresh_success(self, client, registered_user, auth_tokens):
        response = client.post(
            "/api/v1/auth/refresh",
            json=auth_tokens["refresh_token"],
        )
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 30 * 60
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0

    def test_refresh_invalid_token(self, client):
        response = client.post(
            "/api/v1/auth/refresh",
            json="invalid.token.value",
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid refresh token"

    def test_refresh_expired_token(self, client, registered_user):
        expired_token = make_expired_refresh_token(
            registered_user["id"], registered_user["email"]
        )

        response = client.post(
            "/api/v1/auth/refresh",
            json=expired_token,
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid refresh token"

    def test_refresh_inactive_user(self, client, registered_user, auth_tokens):
        set_user_active(registered_user["email"], is_active=False)

        response = client.post(
            "/api/v1/auth/refresh",
            json=auth_tokens["refresh_token"],
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid user"

    def test_refresh_missing_token(self, client):
        response = client.post("/api/v1/auth/refresh", json=None)
        assert response.status_code == 422
