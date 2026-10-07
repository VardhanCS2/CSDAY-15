from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product


def create_order(
    db: Session,
    user_id: int,
    total_amount: float,
    status: str = "Pending",
    shipping_address: dict | None = None,
):
    order = Order(
        user_id=user_id,
        total_amount=total_amount,
        status=status,
        shipping_address=shipping_address,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def create_order_item(
    db: Session,
    order_id: int,
    product_id: int,
    quantity: int,
    price: float,
):
    item = OrderItem(
        order_id=order_id,
        product_id=product_id,
        quantity=quantity,
        price=price,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_user_orders(db: Session, user_id: int):
    return db.query(Order).filter(Order.user_id == user_id).all()


def get_all_orders(db: Session):
    return db.query(Order).order_by(Order.created_at.desc()).all()


def get_order_by_id(
    db: Session,
    order_id: int,
    user_id: int | None = None,
):
    query = db.query(Order).filter(Order.id == order_id)
    if user_id is not None:
        query = query.filter(Order.user_id == user_id)
    return query.first()


def cancel_order_by_id(
    db: Session,
    order_id: int,
    user_id: int | None = None,
):
    query = db.query(Order).filter(Order.id == order_id)
    if user_id is not None:
        query = query.filter(Order.user_id == user_id)
    order = query.first()

    if not order:
        return None, "Order not found"

    if order.status != "Pending":
        return None, f"Cannot cancel an order with status '{order.status}'"

    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity

    order.status = "Cancelled"
    db.commit()
    db.refresh(order)
    return order, None


def complete_order_by_id(db: Session, order_id: int):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        return None, "Order not found"

    if order.status != "Pending":
        return None, f"Cannot complete an order with status '{order.status}'"

    order.status = "Completed"
    db.commit()
    db.refresh(order)
    return order, None
