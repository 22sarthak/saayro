"""google gmail and calendar connector foundation"""
from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260416_0004"
down_revision = "20260416_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("connected_accounts", sa.Column("capabilities_json", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("connected_accounts", sa.Column("provider_account_id", sa.String(length=255), nullable=True))
    op.add_column("connected_accounts", sa.Column("provider_account_email", sa.String(length=255), nullable=True))
    op.add_column("connected_accounts", sa.Column("provider_account_name", sa.String(length=255), nullable=True))
    op.add_column("connected_accounts", sa.Column("sealed_access_token", sa.Text(), nullable=True))
    op.add_column("connected_accounts", sa.Column("sealed_refresh_token", sa.Text(), nullable=True))
    op.add_column("connected_accounts", sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("connected_accounts", sa.Column("last_imported_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("connected_accounts", sa.Column("attached_item_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("connected_accounts", sa.Column("review_needed_item_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("connected_accounts", sa.Column("imported_item_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("connected_accounts", sa.Column("status_message", sa.Text(), nullable=True))
    op.add_column("connected_accounts", sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint(
        "uq_connected_accounts_user_provider",
        "connected_accounts",
        ["user_id", "provider"],
    )

    op.alter_column("connected_accounts", "capabilities_json", server_default=None)
    op.alter_column("connected_accounts", "attached_item_count", server_default=None)
    op.alter_column("connected_accounts", "review_needed_item_count", server_default=None)
    op.alter_column("connected_accounts", "imported_item_count", server_default=None)


def downgrade() -> None:
    op.drop_constraint("uq_connected_accounts_user_provider", "connected_accounts", type_="unique")
    op.drop_column("connected_accounts", "revoked_at")
    op.drop_column("connected_accounts", "status_message")
    op.drop_column("connected_accounts", "imported_item_count")
    op.drop_column("connected_accounts", "review_needed_item_count")
    op.drop_column("connected_accounts", "attached_item_count")
    op.drop_column("connected_accounts", "last_imported_at")
    op.drop_column("connected_accounts", "token_expires_at")
    op.drop_column("connected_accounts", "sealed_refresh_token")
    op.drop_column("connected_accounts", "sealed_access_token")
    op.drop_column("connected_accounts", "provider_account_name")
    op.drop_column("connected_accounts", "provider_account_email")
    op.drop_column("connected_accounts", "provider_account_id")
    op.drop_column("connected_accounts", "capabilities_json")
