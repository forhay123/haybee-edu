import os
import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.domains.lesson_processing.router import router as ai_router
from app.domains.video_processing.router import router as video_processing_router
from app.domains.video_processing.generation_router import router as video_gen_router
from app.domains.video_analytics.router import router as video_analytics_router
from app.domains.individual_processing.router import router as individual_router
from app.domains.lesson_processing import service, schemas
from app.domains.individual_processing.document_upload_router import router as upload_router
from app.core.database import get_db
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Ensure the static folder exists
UPLOAD_FOLDER = settings.PDF_FOLDER or "/app/uploads/lessons"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
logger.info(f"Upload folder: {UPLOAD_FOLDER}")

# Initialize FastAPI app
app = FastAPI(
    title="EduPlatform AI Service",
    description="AI-powered lesson processing and question generation + Video Processing + Individual Student Processing",
    version="2.1.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register API routes - FIXED: No duplicate prefix
app.include_router(ai_router)
app.include_router(video_processing_router)
app.include_router(video_gen_router)
app.include_router(video_analytics_router)
app.include_router(individual_router, tags=["Individual Student Processing"])  # ✅ Removed prefix="/api/individual"
app.include_router(upload_router, prefix="/individual")
# Endpoint: POST /api/upload/document

# Serve static lesson files
app.mount("/static", StaticFiles(directory=UPLOAD_FOLDER), name="static")

@app.get("/")
def root():
    return {
        "message": "AI Service Running ✅",
        "version": "2.1.0",
        "endpoints": {
            "docs": "/docs",
            "sync": "/ai/lessons/sync",
            "process": "/ai/process-lesson",
            "status": "/ai/lessons/{lesson_topic_id}/status",
            "result": "/api/ai-results/{lesson_topic_id}",
            "regenerate": "/ai/regenerate/{lesson_topic_id}",
            # Video processing endpoints
            "video_process": "/video-processing/process",
            "video_status": "/video-processing/status/{job_id}",
            # Video generation endpoints
            "generate_transcript": "/api/videos/{video_id}/generate-transcript",
            "get_transcript": "/api/videos/{video_id}/transcript",
            "generate_chapters": "/api/videos/{video_id}/generate-chapters",
            "get_chapters": "/api/videos/{video_id}/chapters",
            "task_status": "/api/videos/task/{task_id}/status",
            # Analytics endpoints
            "analytics": "/video-analytics/watch-event",
            "recommendations": "/video-analytics/recommendations/{student_id}",
            # ✅ Individual student endpoints (corrected paths)
            "process_timetable": "/individual/process-timetable",
            "timetable_status": "/individual/timetable/{timetable_id}/status",
            "process_scheme": "/individual/process-scheme",
            "scheme_status": "/individual/scheme/{scheme_id}/status",
            "map_subjects": "/individual/map-subjects",
            "health": "/individual/health"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai-service"}

@app.get("/lesson/{lesson_id}", response_model=schemas.LessonAIResultResponse)
def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    """Get lesson AI result by internal lesson_id (ai.lesson_ai_results.id)"""
    svc = service.LessonAIService(db)
    lesson = svc.repo.get_lesson_ai_result(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return schemas.LessonAIResultResponse.from_orm(lesson)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 AI Service started successfully")
    logger.info(f"📁 Upload directory: {UPLOAD_FOLDER}")
    logger.info(f"🔗 Java API URL: {os.getenv('JAVA_API_URL', 'Not configured')}")
    logger.info("🎬 Video Processing: ENABLED")
    logger.info("📊 Video Analytics: ENABLED")
    logger.info("🎯 Video Generation: ENABLED")
    logger.info("👤 Individual Student Processing: ENABLED")
    logger.info("📍 Individual routes registered at: /individual/*")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 AI Service shutting down")