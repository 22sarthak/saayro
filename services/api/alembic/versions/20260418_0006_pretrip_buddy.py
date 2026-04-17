"""pre-trip buddy thread support"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260418_0006"
down_revision = "20260417_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("buddy_threads", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_buddy_threads_user_id_users",
        "buddy_threads",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint("uq_buddy_threads_user_id", "buddy_threads", ["user_id"])
    op.alter_column("buddy_threads", "trip_id", existing_type=sa.String(length=36), nullable=True)
    op.alter_column("buddy_messages", "trip_id", existing_type=sa.String(length=36), nullable=True)


def downgrade() -> None:
    op.alter_column("buddy_messages", "trip_id", existing_type=sa.String(length=36), nullable=False)
    op.alter_column("buddy_threads", "trip_id", existing_type=sa.String(length=36), nullable=False)
    op.drop_constraint("uq_buddy_threads_user_id", "buddy_threads", type_="unique")
    op.drop_constraint("fk_buddy_threads_user_id_users", "buddy_threads", type_="foreignkey")
    op.drop_column("buddy_threads", "user_id")
