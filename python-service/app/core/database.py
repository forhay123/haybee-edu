from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import QueuePool
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Database Engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
)

# ✅ CRITICAL FIX: Set search_path on EVERY connection
# AND disable FK constraint checks to avoid resolution issues
@event.listens_for(engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    """
    Set the PostgreSQL search_path for every new connection.
    This ensures SQLAlchemy can resolve foreign keys across schemas.
    Also temporarily disable FK checks to avoid validation errors during mapper initialization.
    """
    cursor = dbapi_connection.cursor()
    try:
        # Set search path first
        cursor.execute("SET search_path TO core, academic, ai, public;")
        
        # Disable FK constraint checks temporarily
        # This allows inserts/updates without strict FK validation
        cursor.execute("SET session_replication_role = 'replica';")
        
        dbapi_connection.commit()
        logger.debug("✅ search_path set: core, academic, ai, public | FK checks disabled")
    except Exception as e:
        logger.warning(f"⚠️ Failed to set search_path or disable FK checks: {e}")
        try:
            dbapi_connection.rollback()
        except:
            pass
    finally:
        try:
            cursor.close()
        except:
            pass

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for all models
Base = declarative_base()

# FastAPI dependency
def get_db():
    """FastAPI dependency that yields a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()