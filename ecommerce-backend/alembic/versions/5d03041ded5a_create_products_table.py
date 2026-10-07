"""create products table

Revision ID: 5d03041ded5a
Revises: 8e49f45c6e79
Create Date: 2026-09-28 14:35:26.017970

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5d03041ded5a"
down_revision: Union[str, Sequence[str], None] = "8e49f45c6e79"
branch_labels = None
depends_on = None



def upgrade() -> None:

    op.create_table(
        "products",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "name",
            sa.String(length=100),
            nullable=False
        ),

        sa.Column(
            "description",
            sa.String(),
            nullable=True
        ),

        sa.Column(
            "price",
            sa.Float(),
            nullable=False
        ),

        sa.Column(
            "stock",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "image_url",
            sa.String(),
            nullable=True
        ),

        sa.Column(
            "owner_id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True
        ),

        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"]
        ),

        sa.PrimaryKeyConstraint(
            "id"
        )
    )


    op.create_index(
        "ix_products_id",
        "products",
        ["id"],
        unique=False
    )



def downgrade() -> None:

    op.drop_index(
        "ix_products_id",
        table_name="products"
    )

    op.drop_table(
        "products"
    )