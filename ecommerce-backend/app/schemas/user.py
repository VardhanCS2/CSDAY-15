from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    ConfigDict
)



# Registration request
class UserCreate(BaseModel):

    name: str
    email: EmailStr
    password: str



# Login request
class UserLogin(BaseModel):

    email: EmailStr
    password: str



# Token response
class TokenResponse(BaseModel):

    access_token: str
    refresh_token: str
    token_type: str



# Update user
class UserUpdate(BaseModel):

    name: str | None = None
    email: EmailStr | None = None



# User response
class UserResponse(BaseModel):

    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime
    updated_at: datetime


    model_config = ConfigDict(
        from_attributes=True
    )