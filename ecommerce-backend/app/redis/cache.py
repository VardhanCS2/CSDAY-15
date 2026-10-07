import json

from app.redis.connection import redis_client



def add_to_cart(
    user_id: int,
    product_id: int,
    quantity: int
):

    key = f"cart:{user_id}"


    cart = redis_client.get(
        key
    )


    if cart:

        cart = json.loads(cart)

    else:

        cart = {}



    if str(product_id) in cart:

        cart[str(product_id)] += quantity

    else:

        cart[str(product_id)] = quantity



    redis_client.set(
        key,
        json.dumps(cart),
        ex=86400
    )


    return cart



def get_cart(
    user_id: int
):

    key = f"cart:{user_id}"


    cart = redis_client.get(
        key
    )


    if not cart:

        return {}


    return json.loads(cart)



def remove_from_cart(
    user_id: int,
    product_id: int
):

    key = f"cart:{user_id}"


    cart = redis_client.get(
        key
    )


    if not cart:

        return {}



    cart = json.loads(cart)



    cart.pop(
        str(product_id),
        None
    )


    redis_client.set(
        key,
        json.dumps(cart),
        ex=86400
    )


    return cart



def clear_cart(
    user_id: int
):

    key = f"cart:{user_id}"


    redis_client.delete(
        key
    )


    return True



def update_cart_item(
    user_id: int,
    product_id: int,
    quantity: int
):

    key = f"cart:{user_id}"


    cart = redis_client.get(key)


    if cart:
        cart = json.loads(cart)
    else:
        cart = {}


    if quantity <= 0:
        cart.pop(str(product_id), None)
    else:
        cart[str(product_id)] = quantity


    redis_client.set(
        key,
        json.dumps(cart),
        ex=86400
    )


    return cart