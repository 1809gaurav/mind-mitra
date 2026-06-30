"""Tests for protected auth endpoints: profile and logout."""


class TestProfile:
    def test_profile_without_token(self, client):
        response = client.get("/api/v1/auth/profile")
        assert response.status_code == 401
        assert response.json()["detail"] in (
            "Could not validate credentials",
            "Not authenticated",
        )

    def test_profile_with_invalid_token(self, client):
        headers = {"Authorization": "Bearer not-a-valid-jwt"}
        response = client.get("/api/v1/auth/profile", headers=headers)
        assert response.status_code == 401

    def test_profile_with_valid_token(self, client, registered_user, auth_tokens):
        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = client.get("/api/v1/auth/profile", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["name"] == registered_user["name"]


class TestLogout:
    def test_logout_success(self, client, auth_tokens):
        headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
        response = client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"
