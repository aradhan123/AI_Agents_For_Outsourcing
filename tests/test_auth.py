def test_register_login_me_refresh_logout(client):
    r = client.post(
        "/auth/register",
        json={
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "ada@example.com",
            "password": "supersecret123",
        },
    )
    assert r.status_code == 200, r.text
    access = r.json()["access_token"]
    assert access
    assert client.cookies.get("refresh_token")

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "ada@example.com"

    old_refresh = client.cookies.get("refresh_token")
    r = client.post("/auth/refresh")
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]
    new_refresh = client.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    r = client.post("/auth/logout")
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True


def test_login_invalid_password(client):
    client.post(
        "/auth/register",
        json={
            "first_name": "Grace",
            "last_name": "Hopper",
            "email": "grace@example.com",
            "password": "supersecret123",
        },
    )

    r = client.post("/auth/login", json={"email": "grace@example.com", "password": "wrong"})
    assert r.status_code == 401
