from sqlalchemy.orm import Session

from sqlalchemy import or_

from app.models.product import Product

from app.schemas.product import (
    ProductCreate,
    ProductUpdate
)

from app.crud.product import (
    create_product,
    get_product_by_id,
    delete_product
)

from app.utils.pagination import paginate



def create_new_product(
    db: Session,
    product_data: ProductCreate,
    owner_id: int
):

    product = Product(

        name=product_data.name,

        description=product_data.description,

        price=product_data.price,

        stock=product_data.stock,

        owner_id=owner_id

    )


    return create_product(
        db,
        product
    )



def get_all_products(
    db: Session,
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    stock_available: bool | None = None
):

    query = db.query(Product)



    # Search by product name or description

    if search:

        query = query.filter(

            or_(

                Product.name.ilike(
                    f"%{search}%"
                ),

                Product.description.ilike(
                    f"%{search}%"
                )

            )

        )



    # Minimum price filter

    if min_price is not None:

        query = query.filter(
            Product.price >= min_price
        )



    # Maximum price filter

    if max_price is not None:

        query = query.filter(
            Product.price <= max_price
        )



    # Stock filter

    if stock_available is True:

        query = query.filter(
            Product.stock > 0
        )


    elif stock_available is False:

        query = query.filter(
            Product.stock == 0
        )



    return paginate(
        query,
        page,
        limit
    )



def get_single_product(
    db: Session,
    product_id: int
):

    return get_product_by_id(
        db,
        product_id
    )



def update_existing_product(
    db: Session,
    product_id: int,
    product_data: ProductUpdate
):

    product = get_product_by_id(
        db,
        product_id
    )


    if not product:

        return None



    update_data = product_data.model_dump(
        exclude_unset=True
    )


    for key, value in update_data.items():

        setattr(
            product,
            key,
            value
        )



    db.commit()

    db.refresh(product)


    return product



def remove_product(
    db: Session,
    product_id: int
):

    product = get_product_by_id(
        db,
        product_id
    )

    if not product:
        return False

    return delete_product(
        db,
        product
    )