from celery import Celery

from app.core.config import settings



celery_app = Celery(
    "ecommerce",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)


celery_app.autodiscover_tasks(
    [
        "app.celery"
    ]
)