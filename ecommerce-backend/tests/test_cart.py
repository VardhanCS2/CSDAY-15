import pytest


def test_add_cart(client, auth_headers):

    response = client.post(
        "/cart/add",
        headers=auth_headers,
        params={
            "product_identifier": "1",
            "quantity": 1
        }
    )


    assert response.status_code == 200



def test_get_cart(client, auth_headers):

    response = client.get(
        "/cart/",
        headers=auth_headers
    )


    assert response.status_code == 200


@pytest.mark.parametrize("quantity", [0, -1])
def test_add_cart_rejects_nonpositive_quantity(client, auth_headers, quantity):
    response = client.post(
        "/cart/add",
        headers=auth_headers,
        params={"product_identifier": "1", "quantity": quantity},
    )

    assert response.status_code == 422


def test_add_cart_rejects_quantity_above_stock(client, auth_headers):
    created = client.post(
        "/products/",
        headers=auth_headers,
        data={"name": "Cart stock limit test", "price": "1", "stock": "1"},
    )
    assert created.status_code == 200
    product_id = created.json()["data"]["id"]

    response = client.post(
        "/cart/add",
        headers=auth_headers,
        params={"product_identifier": str(product_id), "quantity": 2},
    )

    assert response.status_code == 400
    assert client.delete(f"/products/{product_id}", headers=auth_headers).status_code == 200


def test_edit_cart_rejects_quantity_above_stock(client, auth_headers):
    created = client.post(
        "/products/",
        headers=auth_headers,
        data={"name": "Cart edit stock limit test", "price": "1", "stock": "1"},
    )
    assert created.status_code == 200
    product_id = created.json()["data"]["id"]

    response = client.put(
        "/cart/edit",
        headers=auth_headers,
        params={"product_id": product_id, "quantity": 2},
    )

    assert response.status_code == 400
    assert client.delete(f"/products/{product_id}", headers=auth_headers).status_code == 200