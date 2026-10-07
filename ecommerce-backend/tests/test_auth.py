def test_register_user(client, user_credentials):

    response = client.post(
        "/auth/register",
        json=user_credentials
    )


    assert response.status_code == 200



def test_login_user(client, user_credentials):

    registration = client.post("/auth/register", json=user_credentials)
    assert registration.status_code == 200
    response = client.post(
        "/auth/login",
        json=user_credentials
    )


    assert response.status_code == 200


    data = response.json()


    assert data["success"] is True

    assert "access_token" in data["data"]