from app.database.database import SessionLocal
from app.models.order import Order
from app.models.product import Product


def test_create_order(client, auth_headers):

    cart_response = client.post(
        "/cart/add",
        headers=auth_headers,
        params={
            "product_identifier": "1",
            "quantity": 1
        }
    )

    assert cart_response.status_code == 200

    shipping_address = {
        "full_name": "Test Customer",
        "email": "customer@example.com",
        "phone": "+1 555 010 0150",
        "address_line": "10 Example Street",
        "city": "Example City",
        "postal_code": "10001",
        "country": "Example Country",
    }
    response = client.post(
        "/orders/",
        headers=auth_headers,
        json={"shipping_address": shipping_address},
    )


    assert response.status_code == 200
    assert response.json()["data"]["shipping_address"] == shipping_address

    order_id = response.json()["data"]["id"]
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            for item in order.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    product.stock += item.quantity
            db.delete(order)
            db.commit()
    finally:
        db.close()


def test_create_order_without_shipping_details_remains_supported(client, auth_headers):
    cart_response = client.post(
        "/cart/add",
        headers=auth_headers,
        params={"product_identifier": "1", "quantity": 1},
    )
    assert cart_response.status_code == 200
    response = client.post("/orders/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["shipping_address"] is None

    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == response.json()["data"]["id"]).first()
        if order:
            for item in order.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    product.stock += item.quantity
            db.delete(order)
            db.commit()
    finally:
        db.close()



def test_get_orders(client, auth_headers):

    response = client.get(
        "/orders/",
        headers=auth_headers
    )


    assert response.status_code == 200


def test_admin_can_get_all_orders(client, auth_headers):

    response = client.get(
        "/orders/admin/all",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    orders = response.json()["data"]
    if orders:
        assert "customer" in orders[0]
        assert all("product_name" in item for item in orders[0]["items"])
        assert "hashed_password" not in orders[0]


def test_all_orders_requires_admin(client):

    response = client.get("/orders/admin/all")

    assert response.status_code == 401


def test_customer_cannot_get_all_orders(client, customer_headers):
    response = client.get(
        "/orders/admin/all",
        headers=customer_headers
    )

    assert response.status_code == 403


def test_admin_can_complete_pending_order(client, auth_headers):

    profile = client.get("/auth/me", headers=auth_headers).json()["data"]
    db = SessionLocal()
    order = Order(user_id=profile["id"], total_amount=10, status="Pending")
    db.add(order)
    db.commit()
    db.refresh(order)
    order_id = order.id
    db.close()

    response = client.patch(
        f"/orders/{order_id}/complete",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "Completed"

    db = SessionLocal()
    try:
        db.query(Order).filter(Order.id == order_id).delete()
        db.commit()
    finally:
        db.close()


def test_customer_cannot_complete_order(client, customer_headers):
    response = client.patch("/orders/1/complete", headers=customer_headers)

    assert response.status_code == 403