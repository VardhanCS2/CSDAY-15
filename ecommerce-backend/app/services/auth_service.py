from sqlalchemy.orm import Session


from app.schemas.user import UserCreate


from app.crud.user import (
    get_user_by_email,
    create_user
)


from app.models.user import User


from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)



def register_user(
    db: Session,
    user_data: UserCreate
):

    existing_user = get_user_by_email(
        db,
        user_data.email
    )


    if existing_user:

        raise ValueError(
            "Email already registered"
        )


    hashed_password = hash_password(
        user_data.password
    )


    new_user = User(

        name=user_data.name,

        email=user_data.email,

        hashed_password=hashed_password

    )


    return create_user(
        db,
        new_user
    )



def authenticate_user(
    db: Session,
    email: str,
    password: str
):

    user = get_user_by_email(
        db,
        email
    )


    if not user:

        return None



    password_valid = verify_password(
        password,
        user.hashed_password
    )


    if not password_valid:

        return None



    # Return User object
    # JWT creation will happen in auth.py

    return user





def refresh_access_token(
    refresh_token: str
):

    payload = decode_token(
        refresh_token
    )


    if not payload:

        return None



    user_id = payload.get("sub")

    role = payload.get("role")



    if not user_id:

        return None



    new_access_token = create_access_token(
        {
            "sub": user_id,
            "role": role
        }
    )


    return {

        "access_token": new_access_token,

        "token_type": "bearer"

    }