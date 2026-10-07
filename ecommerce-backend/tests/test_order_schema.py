import pytest
from pydantic import ValidationError

from app.schemas.order import OrderCreate


def test_order_create_accepts_a_valid_delivery_address():
    payload = {
        "shipping_address": {
            "full_name": "Taylor Guest",
            "email": "taylor@example.com",
            "phone": "+1 555 010 0150",
            "address_line": "10 Example Street",
            "city": "Example City",
            "postal_code": "10001",
            "country": "Example Country",
        }
    }

    order = OrderCreate.model_validate(payload)

    assert order.shipping_address is not None
    assert order.shipping_address.full_name == "Taylor Guest"


@pytest.mark.parametrize(
    "field,value",
    [
        ("email", "not-an-email"),
        ("phone", "letters only"),
        ("phone", "++++++++"),
        ("address_line", "abc"),
    ],
)
def test_order_create_rejects_invalid_delivery_fields(field, value):
    address = {
        "full_name": "Taylor Guest",
        "email": "taylor@example.com",
        "phone": "+1 555 010 0150",
        "address_line": "10 Example Street",
        "city": "Example City",
        "postal_code": "10001",
        "country": "Example Country",
    }
    address[field] = value

    with pytest.raises(ValidationError):
        OrderCreate.model_validate({"shipping_address": address})


def test_order_create_still_allows_legacy_empty_body():
    assert OrderCreate().shipping_address is None
