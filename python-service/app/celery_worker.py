# ============================================================
# FILE 2: celery_worker.py (ROOT LEVEL)
# ============================================================
"""
Celery Worker Entry Point
Run with: celery -A celery_worker worker --loglevel=info
"""
import os
import sys

# Add app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.celery_app import celery_app
from app.core.logger import get_logger

# Import all task modules to register them
from app.domains.video_processing import tasks

logger = get_logger(__name__)

# Configure worker
celery_app.conf.update(
    worker_concurrency=4,  # Number of worker processes
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks (prevent memory leaks)
    worker_prefetch_multiplier=1,  # Fetch one task at a time
)

if __name__ == '__main__':
    logger.info("🚀 Starting Celery worker...")
    celery_app.start()