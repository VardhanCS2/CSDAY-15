from sqlalchemy.orm import Session

from fastapi import HTTPException


from app.redis.cache import (
    get_cart,
    clear_cart
)


from app.models.product import Product
from app.models.user import User


from app.crud.order import (
    create_order,
    create_order_item,
    get_all_orders as get_all_orders_crud,
    get_user_orders,
    get_order_by_id,
    cancel_order_by_id,
    complete_order_by_id,
)


from app.celery.tasks import send_order_email



def place_order(
    db: Session,
    user_id: int,
    shipping_address: dict | None = None,
):

    cart = get_cart(
        user_id
    )


    if not cart:

        raise HTTPException(
            status_code=400,
            detail="Cart is empty"
        )



    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )



    total_amount = 0

    products = []



    # Check products and stock

    for product_id, quantity in cart.items():

        product = (
            db.query(Product)
            .filter(
                Product.id == int(product_id)
            )
            .first()
        )


        if not product:

            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )



        if product.stock < quantity:

            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for {product.name}"
            )



        total_amount += (
            product.price * quantity
        )


        products.append(
            (
                product,
                quantity
            )
        )



    # Create order

    order = create_order(
        db,
        user_id,
        total_amount,
        shipping_address=shipping_address,
    )



    # Create order items and reduce stock

    for product, quantity in products:


        create_order_item(
            db,
            order.id,
            product.id,
            quantity,
            product.price
        )


        product.stock -= quantity



    db.commit()



    # Clear Redis cart

    clear_cart(
        user_id
    )



    # Send email in background using Celery

    send_order_email.delay(
        user.email,
        order.id
    )



    return order




def get_orders(
    db: Session,
    user_id: int
):

    return get_user_orders(
        db,
        user_id
    )




def get_all_orders(
    db: Session
):

    return get_all_orders_crud(db)


def get_order(
    db: Session,
    order_id: int,
    user_id: int | None = None
):

    return get_order_by_id(
        db,
        order_id,
        user_id
    )



def cancel_order(
    db: Session,
    order_id: int,
    user_id: int | None = None
):

    return cancel_order_by_id(
        db,
        order_id,
        user_id
    )


def complete_order(db: Session, order_id: int):
    return complete_order_by_id(db, order_id)
