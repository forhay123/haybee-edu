"""
app/domains/individual_processing/service.py
FIXED: Ensures class_id is passed to subject mapper
"""
import os
import httpx
from typing import List
from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.core.config import settings
from app.domains.individual_processing import schemas, timetable_extractor, scheme_extractor, subject_mapper

logger = get_logger(__name__)

# Get Java API URL
JAVA_API_URL = os.getenv("JAVA_API_URL", "http://java-service:8080/api/v1/lesson-topics")
if "/api/v1" in JAVA_API_URL:
    JAVA_API_URL = JAVA_API_URL.split("/api/v1")[0] + "/api/v1"
else:
    JAVA_API_URL = "http://java-service:8080/api/v1"
    
logger.info(f"🔗 Java API base URL: {JAVA_API_URL}")


async def process_timetable(
    request: schemas.TimetableUploadRequest,
    db: Session
) -> schemas.TimetableExtractionResult:
    """
    Process uploaded timetable document:
    FIXED: Now properly passes class_id to subject mapper
    ✅ SPRINT 9: Now includes conflict detection
    1. Download file
    2. Extract timetable entries using AI
    3. Detect schedule conflicts
    4. Map subjects to platform (filtered by class AND level)
    5. Update Java database via callback
    """
    logger.info(
        f"🚀 Starting timetable processing for ID: {request.timetable_id}, "
        f"student_id: {request.student_id}, class_id: {request.class_id}"
    )
    
    try:
        # Update status to PROCESSING
        await _update_timetable_status(request.timetable_id, "PROCESSING")
        
        # Extract timetable entries
        entries = timetable_extractor.extract_timetable(request.file_url)
        
        if not entries:
            raise ValueError("No timetable entries found in document")
        
        # ✅ NEW: Validate timetable and detect conflicts
        from app.domains.individual_processing.timetable_extractor import validate_timetable
        is_valid, conflicts = validate_timetable(entries)
        
        if conflicts:
            logger.warning(f"⚠️ Timetable has {len(conflicts)} conflicts detected")
            high_severity = [c for c in conflicts if c.severity == "HIGH"]
            if high_severity:
                logger.error(f"❌ {len(high_severity)} HIGH severity conflicts found")
        
        # Extract unique subjects
        unique_subjects = list(set(entry.subject for entry in entries))
        logger.info(f"📚 Extracted {len(unique_subjects)} unique subjects: {unique_subjects}")
        
        # ✅ CRITICAL FIX: Pass class_id to subject mapper
        logger.info(f"🎯 Mapping subjects with class_id={request.class_id}")
        mapping_result = subject_mapper.map_subjects(
            extracted_subjects=unique_subjects,
            db=db,
            is_individual=True,
            class_id=request.class_id
        )
        
        logger.info(f"✅ Mapped {len(mapping_result.matched_subjects)} subjects")
        logger.info(f"⚠️ Unmatched: {len(mapping_result.unmatched_subjects)}")
        
        if mapping_result.unmatched_subjects:
            logger.warning(f"Unmatched subjects: {mapping_result.unmatched_subjects}")
        
        # Build result
        result = schemas.TimetableExtractionResult(
            timetable_id=request.timetable_id,
            student_id=request.student_id,
            total_periods_extracted=len(entries),
            subjects_identified=len(unique_subjects),
            entries=entries,
            subjects_detected=unique_subjects,
            subject_mapping=mapping_result,
            confidence_score=_calculate_confidence(entries, mapping_result)
        )
        
        # Update Java database with results INCLUDING entries AND conflicts
        await _update_timetable_completion(
            request.timetable_id,
            len(entries),
            len(mapping_result.matched_subjects),
            result.confidence_score,
            entries,
            mapping_result
        )
        
        logger.info(
            f"✅ Timetable processing completed: "
            f"{len(entries)} entries, {len(unique_subjects)} subjects, "
            f"{len(mapping_result.matched_subjects)} mapped, "
            f"{len(conflicts)} conflicts detected"
        )
        return result
        
    except Exception as e:
        logger.error(f"❌ Timetable processing failed: {e}", exc_info=True)
        
        # Update status to FAILED
        await _update_timetable_status(request.timetable_id, "FAILED", str(e))
        
        raise


async def process_scheme(
    request: schemas.SchemeUploadRequest,
    db: Session
) -> schemas.SchemeExtractionResult:
    """
    Process uploaded scheme of work document
    (No changes needed - schemes don't use class filtering)
    """
    logger.info(f"🚀 Starting scheme processing for ID: {request.scheme_id}")
    
    try:
        await _update_scheme_status(request.scheme_id, "PROCESSING")
        
        topics = scheme_extractor.extract_scheme(request.file_url)
        
        if not topics:
            raise ValueError("No topics found in scheme document")
        
        unique_subjects = list(set(topic.subject for topic in topics))
        logger.info(f"📚 Extracted {len(unique_subjects)} unique subjects")
        
        mapping_result = subject_mapper.map_subjects(
            extracted_subjects=unique_subjects,
            db=db,
            is_individual=True
        )
        
        logger.info(f"✅ Mapped {len(mapping_result.matched_subjects)} subjects")
        logger.info(f"⚠️ Unmatched: {len(mapping_result.unmatched_subjects)}")
        
        if mapping_result.unmatched_subjects:
            logger.warning(f"Unmatched subjects: {mapping_result.unmatched_subjects}")
        
        result = schemas.SchemeExtractionResult(
            scheme_id=request.scheme_id,
            student_id=request.student_id,
            subject_id=request.subject_id,
            total_topics_extracted=len(topics),
            weeks_covered=_count_weeks(topics),
            topics=topics,
            subject_mapping=mapping_result,
            confidence_score=_calculate_confidence(topics, mapping_result)
        )
        
        await _update_scheme_completion(
            request.scheme_id,
            len(topics),
            result.weeks_covered,
            result.confidence_score
        )
        
        logger.info(f"✅ Scheme processing completed: {len(topics)} topics, {result.weeks_covered} weeks")
        return result
        
    except Exception as e:
        logger.error(f"❌ Scheme processing failed: {e}", exc_info=True)
        await _update_scheme_status(request.scheme_id, "FAILED", str(e))
        raise


async def map_subjects(
    request: schemas.SubjectMappingRequest,
    db: Session
) -> schemas.SubjectMappingResult:
    """
    Map extracted subject names to platform subjects
    """
    logger.info(f"🔍 Mapping {len(request.extracted_subjects)} subjects")
    
    result = subject_mapper.map_subjects(
        extracted_subjects=request.extracted_subjects,
        db=db,
        is_individual=True
    )
    
    logger.info(f"✅ Mapped {len(result.matched_subjects)} subjects, {len(result.unmatched_subjects)} unmatched")
    return result


# ============================================================
# JAVA API CALLBACKS
# ============================================================

async def _update_timetable_status(timetable_id: int, status: str, error: str = None):
    """Call Java API to update timetable processing status"""
    try:
        url = f"{JAVA_API_URL}/individual/callback/timetable/{timetable_id}/status"
        
        payload = {
            "status": status,
            "error": error
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
        logger.info(f"✅ Updated timetable {timetable_id} status to: {status}")
        
    except Exception as e:
        logger.error(f"❌ Failed to update timetable status: {e}")


async def _update_timetable_completion(
    timetable_id: int,
    total_periods: int,
    subjects_count: int,
    confidence: float,
    entries: List[schemas.TimetableEntry],
    mapping_result: schemas.SubjectMappingResult
):
    """
    Call Java API to update timetable extraction results WITH entries AND conflicts
    ✅ SPRINT 9: Now includes conflict detection results
    """
    try:
        url = f"{JAVA_API_URL}/individual/callback/timetable/{timetable_id}/status"
        
        # Convert entries to JSON format
        entries_json = []
        for entry in entries:
            # Find subject mapping
            subject_id = None
            mapping_confidence = None
            
            for match in mapping_result.matched_subjects:
                if match.extracted_name.lower() == entry.subject.lower():
                    subject_id = match.platform_subject_id
                    mapping_confidence = match.confidence
                    break
            
            entry_dict = {
                "dayOfWeek": entry.day.upper(),
                "periodNumber": entry.period_number,
                "startTime": entry.start_time,
                "endTime": entry.end_time,
                "subjectName": entry.subject,
                "subjectId": subject_id,
                "mappingConfidence": mapping_confidence,
                "room": entry.room if hasattr(entry, 'room') else None,
                "teacher": entry.teacher if hasattr(entry, 'teacher') else None
            }
            entries_json.append(entry_dict)
        
        # ✅ NEW: Detect conflicts in extracted timetable
        from app.domains.individual_processing.timetable_extractor import validate_timetable
        
        is_valid, conflicts = validate_timetable(entries)
        
        conflicts_json = []
        if conflicts:
            logger.warning(f"⚠️ Detected {len(conflicts)} conflicts in timetable")
            for conflict in conflicts:
                conflicts_json.append(conflict.to_dict())
        
        payload = {
            "status": "COMPLETED",
            "total_periods": total_periods,
            "subjects_count": subjects_count,
            "confidence": confidence,
            "entries": entries_json,
            "has_conflicts": len(conflicts) > 0,  # ✅ NEW
            "conflicts": conflicts_json  # ✅ NEW
        }
        
        logger.info(f"📤 Sending {len(entries_json)} entries and {len(conflicts_json)} conflicts to Java API")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
        logger.info(f"✅ Updated timetable {timetable_id} completion results with {len(entries_json)} entries")
        
    except Exception as e:
        logger.error(f"❌ Failed to update timetable completion: {e}", exc_info=True)


async def _update_scheme_status(scheme_id: int, status: str, error: str = None):
    """Call Java API to update scheme processing status"""
    try:
        url = f"{JAVA_API_URL}/individual/callback/scheme/{scheme_id}/status"
        
        payload = {
            "status": status,
            "error": error
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
        logger.info(f"✅ Updated scheme {scheme_id} status to: {status}")
        
    except Exception as e:
        logger.error(f"❌ Failed to update scheme status: {e}")


async def _update_scheme_completion(
    scheme_id: int,
    total_topics: int,
    weeks_count: int,
    confidence: float
):
    """Call Java API to update scheme extraction results"""
    try:
        url = f"{JAVA_API_URL}/individual/callback/scheme/{scheme_id}/status"
        
        payload = {
            "status": "COMPLETED",
            "total_topics": total_topics,
            "weeks_count": weeks_count,
            "confidence": confidence
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
        logger.info(f"✅ Updated scheme {scheme_id} completion results")
        
    except Exception as e:
        logger.error(f"❌ Failed to update scheme completion: {e}")


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _calculate_confidence(entries: List, mapping_result: schemas.SubjectMappingResult) -> float:
    """Calculate overall confidence score"""
    if not entries:
        return 0.0
    
    # Base confidence on mapping success rate
    total_subjects = len(mapping_result.matched_subjects) + len(mapping_result.unmatched_subjects)
    if total_subjects == 0:
        return 0.0
    
    mapping_rate = len(mapping_result.matched_subjects) / total_subjects
    
    # Average subject mapping confidence
    if mapping_result.matched_subjects:
        avg_match_confidence = sum(m.confidence for m in mapping_result.matched_subjects) / len(mapping_result.matched_subjects)
    else:
        avg_match_confidence = 0.0
    
    # Combined score
    return (mapping_rate * 0.5 + avg_match_confidence * 0.5)


def _count_weeks(topics: List[schemas.SchemeTopic]) -> int:
    """Count unique weeks in scheme topics"""
    weeks = set(topic.week_number for topic in topics if topic.week_number)
    return len(weeks)