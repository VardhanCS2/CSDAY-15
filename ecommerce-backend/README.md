# E-commerce Backend

## Local Setup

Use Python 3.10 or later. PostgreSQL and Redis must be running before starting the API. Start from `.env.example`, copy it to the ignored `.env` file, and fill in local values. Never commit `.env` or place production secrets in source, tests, or frontend `VITE_*` variables.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL` to the local PostgreSQL database, generate a private `JWT_SECRET_KEY`, and configure Redis URLs for `REDIS_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND`. The SMTP settings are required by the current settings model; order email work is currently logged by the Celery task.

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

In another terminal, start the Celery worker for order tasks:

```powershell
celery -A app.celery.worker.celery_app worker --loglevel=info --pool=solo
```

API docs are available at `http://127.0.0.1:8000/docs`. Tests generate per-test users and connect to the configured database and Redis service:

```powershell
pytest -q
```

The checkout endpoint accepts an optional validated `shipping_address` object and stores it with the order. `alembic upgrade head` applies the nullable address column without invalidating existing orders or clients that still submit an empty order request.
