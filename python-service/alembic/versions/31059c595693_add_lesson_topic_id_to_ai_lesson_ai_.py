"""add lesson_topic_id to ai.lesson_ai_results

Revision ID: 31059c595693
Revises: cf7eeb931404
Create Date: 2025-11-05 00:42:26.209113
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '31059c595693'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'lesson_ai_results',
        sa.Column('lesson_topic_id', sa.Integer(), nullable=False),
        schema='ai'
    )


def downgrade() -> None:
    op.drop_column('lesson_ai_results', 'lesson_topic_id', schema='ai')
