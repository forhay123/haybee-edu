"""
app/domains/individual_processing/tasks.py
Celery tasks for asynchronous document processing
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.logger import get_logger
from app.domains.individual_processing import service, schemas
from app.models.individual_timetable import IndividualStudentTimetable
from app.models.individual_scheme import IndividualStudentScheme

logger = get_logger(__name__)


@celery_app.task(bind=True, name='process_timetable_async', max_retries=3)
def process_timetable_async(self, timetable_id: int):
    """
    Async task to process uploaded timetable
    
    Args:
        timetable_id: ID of the IndividualStudentTimetable record
        
    Returns:
        Dict with processing results
    """
    logger.info(f"🚀 Task started: process_timetable_async for timetable {timetable_id}")
    
    db = SessionLocal()
    
    try:
        # Get timetable record
        timetable = db.query(IndividualStudentTimetable).filter_by(id=timetable_id).first()
        
        if not timetable:
            logger.error(f"❌ Timetable {timetable_id} not found")
            return {"status": "error", "message": "Timetable not found"}
        
        # Create request object
        request = schemas.TimetableUploadRequest(
            student_id=timetable.student_profile_id,
            file_url=timetable.file_url,
            original_filename=timetable.original_filename,
            academic_year=timetable.academic_year,
            term_id=timetable.term_id
        )
        
        # Process timetable (this is now a coroutine, so we need to handle it)
        import asyncio
        result = asyncio.run(service.process_timetable(request, db))
        
        logger.info(f"✅ Timetable {timetable_id} processed successfully")
        
        return {
            "status": "success",
            "timetable_id": timetable_id,
            "entries_count": len(result.entries),
            "subjects_count": len(result.subjects_detected),
            "message": "Timetable processed successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Timetable processing failed: {e}", exc_info=True)
        
        try:
            # Update timetable status
            timetable = db.query(IndividualStudentTimetable).filter_by(id=timetable_id).first()
            if timetable:
                timetable.processing_status = 'FAILED'
                timetable.processing_error = str(e)
                db.commit()
        except:
            db.rollback()
        
        # Retry logic
        try:
            raise self.retry(exc=e, countdown=60, max_retries=self.max_retries)
        except self.MaxRetriesExceededError:
            return {
                "status": "error",
                "message": f"Processing failed after retries: {str(e)}",
                "timetable_id": timetable_id
            }
    
    finally:
        try:
            db.close()
        except:
            pass


@celery_app.task(bind=True, name='process_scheme_async', max_retries=3)
def process_scheme_async(self, scheme_id: int):
    """
    Async task to process uploaded scheme of work
    
    Args:
        scheme_id: ID of the IndividualStudentScheme record
        
    Returns:
        Dict with processing results
    """
    logger.info(f"🚀 Task started: process_scheme_async for scheme {scheme_id}")
    
    db = SessionLocal()
    
    try:
        # Get scheme record
        scheme = db.query(IndividualStudentScheme).filter_by(id=scheme_id).first()
        
        if not scheme:
            logger.error(f"❌ Scheme {scheme_id} not found")
            return {"status": "error", "message": "Scheme not found"}
        
        # Create request object
        request = schemas.SchemeUploadRequest(
            student_id=scheme.student_profile_id,
            subject_id=scheme.subject_id,
            file_url=scheme.file_url,
            original_filename=scheme.original_filename,
            academic_year=scheme.academic_year,
            term_id=scheme.term_id
        )
        
        # Process scheme
        import asyncio
        result = asyncio.run(service.process_scheme(request, db))
        
        logger.info(f"✅ Scheme {scheme_id} processed successfully")
        
        return {
            "status": "success",
            "scheme_id": scheme_id,
            "topics_count": len(result.topics),
            "weeks_covered": result.weeks_covered,
            "message": "Scheme processed successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Scheme processing failed: {e}", exc_info=True)
        
        try:
            # Update scheme status
            scheme = db.query(IndividualStudentScheme).filter_by(id=scheme_id).first()
            if scheme:
                scheme.processing_status = 'FAILED'
                scheme.processing_error = str(e)
                db.commit()
        except:
            db.rollback()
        
        # Retry logic
        try:
            raise self.retry(exc=e, countdown=60, max_retries=self.max_retries)
        except self.MaxRetriesExceededError:
            return {
                "status": "error",
                "message": f"Processing failed after retries: {str(e)}",
                "scheme_id": scheme_id
            }
    
    finally:
        try:
            db.close()
        except:
            pass