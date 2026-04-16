"""buddy ai structured fields"""
from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260416_0002"
down_revision = "20260416_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("buddy_messages", sa.Column("response_json", sa.JSON(), nullable=True))
    op.add_column("buddy_messages", sa.Column("scope_class", sa.String(length=50), nullable=True))
    op.add_column("buddy_messages", sa.Column("provider_name", sa.String(length=50), nullable=True))
    op.add_column("buddy_messages", sa.Column("model_name", sa.String(length=100), nullable=True))
    op.add_column("buddy_messages", sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("buddy_messages", "fallback_used", server_default=None)


def downgrade() -> None:
    op.drop_column("buddy_messages", "fallback_used")
    op.drop_column("buddy_messages", "model_name")
    op.drop_column("buddy_messages", "provider_name")
    op.drop_column("buddy_messages", "scope_class")
    op.drop_column("buddy_messages", "response_json")
