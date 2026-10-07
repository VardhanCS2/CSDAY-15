from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


from app.core.exceptions import (
    AppException,
    app_exception_handler,
    general_exception_handler
)


from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as product_router
from app.api.v1.cart import router as cart_router
from app.api.v1.orders import router as order_router


from app.websocket.routes import router as websocket_router



app = FastAPI(
    title="E-commerce Backend API"
)

app.mount(
    "/uploads",
    StaticFiles(directory=Path(__file__).resolve().parent / "uploads"),
    name="uploads",
)



# Global exception handlers

app.add_exception_handler(
    AppException,
    app_exception_handler
)


app.add_exception_handler(
    Exception,
    general_exception_handler
)



# API routers

app.include_router(
    auth_router
)


app.include_router(
    product_router
)


app.include_router(
    cart_router
)


app.include_router(
    order_router
)



# WebSocket router

app.include_router(
    websocket_router
)



@app.get("/")
def root():

    return {
        "message": "API is running"
    }