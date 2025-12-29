"""
app/celery_app.py
Celery application configuration for distributed task processing
"""
import os
from celery import Celery

# Get broker URL from environment
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/1')

# Create Celery app instance
celery_app = Celery(
    'edu_platform',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        'app.domains.lesson_processing.tasks',
        'app.domains.video_processing.generation_service',
        'app.domains.individual_processing.tasks',  # ✅ ADDED
    ]
)

# Configure Celery
celery_app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_time_limit=7200,  # 2 hours
    task_soft_time_limit=3600,  # 1 hour
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    
    # Result backend
    result_expires=86400,  # 24 hours
    result_persistent=True,
    result_extended=True,
)

if __name__ == '__main__':
    celery_app.start()