"""Persist validated checkout delivery details on orders.

Revision ID: 20261006_shipping_address
Revises: 9a2157893679
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261006_shipping_address"
down_revision: Union[str, Sequence[str], None] = "9a2157893679"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("shipping_address", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "shipping_address")
