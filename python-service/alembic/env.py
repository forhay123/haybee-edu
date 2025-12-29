from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import your Base and settings
from app.core.database import Base
from app.core.config import settings

# Import AI models explicitly so Alembic can detect them
from app.models.lesson_ai_result import LessonAIResult
from app.models.lesson_question import LessonQuestion

# --------------------------------------------------------------------
# Alembic Config object
# --------------------------------------------------------------------
config = context.config

# Load DATABASE_URL dynamically from .env
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Logging setup
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target only AI metadata
target_metadata = Base.metadata

# Use schema from environment (.env), default to "ai"
schema_name = getattr(settings, "DB_SCHEMA", "ai")

# --------------------------------------------------------------------
# Filter function to include only AI tables
# --------------------------------------------------------------------
def include_object(object, name, type_, reflected, compare_to):
    """
    Include only tables in the 'ai' schema.
    Ignore all other tables (academic, core, etc.).
    """
    if type_ == "table" and getattr(object, "schema", None) == "ai":
        return True
    return False

# --------------------------------------------------------------------
# OFFLINE migration mode
# --------------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        version_table_schema=schema_name,
        include_schemas=True,
        include_object=include_object,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

# --------------------------------------------------------------------
# ONLINE migration mode
# --------------------------------------------------------------------
def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=schema_name,
            include_schemas=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()

# --------------------------------------------------------------------
# Determine execution mode
# --------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
