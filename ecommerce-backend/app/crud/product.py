from sqlalchemy.orm import Session

from app.models.product import Product

from app.schemas.product import ProductUpdate



def create_product(
    db: Session,
    product: Product
):

    db.add(product)

    db.commit()

    db.refresh(product)

    return product



def get_products(
    db: Session
):

    return (
        db.query(Product)
        .all()
    )



def get_product_by_id(
    db: Session,
    product_id: int
):

    return (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )



def update_product(
    db: Session,
    product: Product,
    product_data: ProductUpdate
):

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



def delete_product(
    db: Session,
    product: Product
):

    db.delete(product)

    db.commit()

    return True