"""
app/domains/individual_processing/router.py
FastAPI routes for individual student document processing
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.logger import get_logger
from app.domains.individual_processing import schemas, service

logger = get_logger(__name__)

router = APIRouter(
    prefix="/individual",
    tags=["Individual Student Processing"],
)


# ============================================================
# TIMETABLE UPLOAD / EXTRACTION
# ============================================================
@router.post("/process-timetable", response_model=schemas.TimetableExtractionResult)
async def process_timetable(
    request: schemas.TimetableUploadRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Receive a timetable upload request from Java, extract structured timetable entries.
    
    Steps:
    1. Receive file URL from Java service
    2. Download and parse document (PDF/Excel/Image)
    3. Extract timetable entries using AI (OCR + GPT)
    4. Map subjects to platform subjects
    5. Update database with results
    6. Return structured timetable data
    """
    logger.info(f"📥 Received timetable processing request for student {request.student_id}")
    
    try:
        result = await service.process_timetable(request, db)
        logger.info(f"✅ Timetable processed successfully")
        return result
        
    except Exception as e:
        logger.error(f"❌ Timetable processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Timetable processing failed: {str(e)}")


# ============================================================
# SCHEME-OF-WORK UPLOAD / EXTRACTION
# ============================================================
@router.post("/process-scheme", response_model=schemas.SchemeExtractionResult)
async def process_scheme(
    request: schemas.SchemeUploadRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Receive a scheme-of-work upload request from Java, extract topics and subtopics.
    
    Steps:
    1. Receive file URL from Java service
    2. Download and parse document (PDF/Excel/Word/Image)
    3. Extract week-by-week topics using AI
    4. Map topics to platform subjects
    5. Save to individual_lesson_topics table
    6. Return structured scheme data
    """
    logger.info(f"📥 Received scheme processing request for student {request.student_id}")
    
    try:
        result = await service.process_scheme(request, db)
        logger.info(f"✅ Scheme processed successfully")
        return result
        
    except Exception as e:
        logger.error(f"❌ Scheme processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scheme processing failed: {str(e)}")


# ============================================================
# SUBJECT MAPPING
# ============================================================
@router.post("/map-subjects", response_model=schemas.SubjectMappingResult)
async def map_subjects(
    request: schemas.SubjectMappingRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Receive a list of extracted subject names, return mapped platform subject IDs with confidence.
    
    Uses fuzzy matching to map extracted subject names (e.g., "Maths", "Mathematics")
    to platform subjects in the database.
    """
    logger.info(f"📥 Received subject mapping request: {request.extracted_subjects}")
    
    try:
        result = await service.map_subjects(request, db)
        logger.info(f"✅ Subject mapping completed")
        return result
        
    except Exception as e:
        logger.error(f"❌ Subject mapping failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Subject mapping failed: {str(e)}")


# ============================================================
# HEALTH CHECK
# ============================================================
@router.get("/health")
async def health_check():
    """Health check endpoint for individual processing service"""
    return {
        "status": "healthy",
        "service": "individual_processing",
        "version": "1.0.0"
    }