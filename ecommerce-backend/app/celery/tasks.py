from app.celery.worker import celery_app


@celery_app.task(
    name="send_order_email"
)
def send_order_email(
    email: str,
    order_id: int
):

    print(
        f"Sending order confirmation email to {email}"
    )


    print(
        f"Order ID: {order_id}"
    )


    return "Email sent successfully"