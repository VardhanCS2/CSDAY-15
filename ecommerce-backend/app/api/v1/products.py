from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form
)

from sqlalchemy.orm import Session


from app.database.database import get_db


from app.schemas.product import (
    ProductCreate,
    ProductUpdate
)


from app.services.product_service import (
    create_new_product,
    get_all_products,
    get_single_product,
    update_existing_product,
    remove_product
)


from app.api.deps import get_current_admin


from app.models.user import User


from app.utils.image import save_image


from app.utils.response import success_response



router = APIRouter(
    prefix="/products",
    tags=["Products"]
)



# Get products with pagination + filtering

@router.get("/")
def get_products(

    page: int = 1,

    limit: int = 10,

    search: str | None = None,

    min_price: float | None = None,

    max_price: float | None = None,

    stock_available: bool | None = None,

    db: Session = Depends(get_db)

):

    products = get_all_products(

        db,

        page,

        limit,

        search,

        min_price,

        max_price,

        stock_available

    )


    return success_response(

        data=products,

        message="Products fetched successfully"

    )



@router.get("/{product_id}")
def get_product(

    product_id: int,

    db: Session = Depends(get_db)

):

    product = get_single_product(

        db,

        product_id

    )


    if not product:

        raise HTTPException(

            status_code=404,

            detail="Product not found"

        )


    return success_response(

        data=product,

        message="Product fetched successfully"

    )



# Admin create product

@router.post("/")
def create_product(

    name: str = Form(...),

    description: str = Form(None),

    price: float = Form(...),

    stock: int = Form(...),

    image: UploadFile = File(None),

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_admin)

):

    image_path = None


    if image:

        image_path = save_image(image)



    product_data = ProductCreate(

        name=name,

        description=description,

        price=price,

        stock=stock

    )


    product = create_new_product(

        db,

        product_data,

        current_user.id

    )



    if image_path:

        product.image_url = image_path

        db.commit()

        db.refresh(product)



    return success_response(

        data=product,

        message="Product created successfully"

    )



@router.put("/{product_id}")
def update_product(

    product_id: int,

    product_data: ProductUpdate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_admin)

):

    product = update_existing_product(

        db,

        product_id,

        product_data

    )


    if not product:

        raise HTTPException(

            status_code=404,

            detail="Product not found"

        )


    return success_response(

        data=product,

        message="Product updated successfully"

    )



@router.delete("/{product_id}")
def delete_product(

    product_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_admin)

):

    deleted = remove_product(

        db,

        product_id

    )


    if not deleted:

        raise HTTPException(

            status_code=404,

            detail="Product not found"

        )


    return success_response(

        data=None,

        message="Product deleted successfully"

    )
