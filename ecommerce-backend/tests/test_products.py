def test_get_products(client):

    response = client.get(
        "/products/"
    )


    assert response.status_code == 200

    data = response.json()


    assert data["success"] is True



def test_create_product(client, auth_headers):

    response = client.post(
        "/products/",
        headers=auth_headers,
        data={
            "name": "Test Product",
            "description": "Testing product",
            "price": "1000",
            "stock": "10"
        }
    )


    assert response.status_code == 200

    product_id = response.json()["data"]["id"]
    deleted = client.delete(
        f"/products/{product_id}",
        headers=auth_headers
    )

    assert deleted.status_code == 200


def test_delete_product(client, auth_headers):

    created = client.post(
        "/products/",
        headers=auth_headers,
        data={
            "name": "Delete endpoint regression",
            "description": "Temporary test product",
            "price": "1",
            "stock": "1"
        }
    )

    assert created.status_code == 200
    product_id = created.json()["data"]["id"]

    response = client.delete(
        f"/products/{product_id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["success"] is True