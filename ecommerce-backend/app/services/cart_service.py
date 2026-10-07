from sqlalchemy.orm import Session

from app.models.product import Product


from app.redis.cache import (
    add_to_cart,
    get_cart,
    remove_from_cart,
    clear_cart,
    update_cart_item
)



def add_product_to_cart(
    user_id: int,
    product_id: int,
    quantity: int
):

    return add_to_cart(
        user_id,
        product_id,
        quantity
    )



def get_user_cart(
    db: Session,
    user_id: int
):

    # Get cart from Redis
    cart = get_cart(
        user_id
    )


    if not cart:

        return []



    cart_details = []



    for product_id, quantity in cart.items():

        product = db.query(Product).filter(
            Product.id == int(product_id)
        ).first()



        if product:

            cart_details.append(

                {
                    "product_id": product.id,

                    "name": product.name,

                    "description": product.description,

                    "price": product.price,

                    "quantity": quantity,

                    "total_price": product.price * quantity
                }

            )


    return cart_details




def remove_product_from_cart(
    user_id: int,
    product_id: int
):

    return remove_from_cart(
        user_id,
        product_id
    )



def clear_user_cart(
    user_id: int
):

    return clear_cart(
        user_id
    )



def update_product_in_cart(
    user_id: int,
    product_id: int,
    quantity: int
):

    return update_cart_item(
        user_id,
        product_id,
        quantity
    )