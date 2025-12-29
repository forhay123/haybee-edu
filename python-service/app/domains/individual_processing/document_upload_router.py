"""
app/domains/individual_processing/document_upload_router.py
FIXED: Proper FastAPI dependency injection for database session
"""
import os
import tempfile
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.core.logger import get_logger
from app.core.database import get_db
from app.domains.individual_processing import service, schemas, timetable_extractor, scheme_extractor
from app.domains.individual_processing.document_upload_service import DocumentUploadService

logger = get_logger(__name__)

router = APIRouter(prefix="/upload", tags=["document-upload"])

# Initialize service
upload_service = DocumentUploadService()


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    upload_type: str = Form(...),  # 'camera' or 'file'
    document_type: str = Form(...),  # 'timetable' or 'scheme'
    student_id: Optional[int] = Form(None),
    class_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)  # ✅ FIXED: Use Depends() instead of None
):
    """
    Handle document uploads from camera or file.
    Processes immediately and returns results (no polling needed).
    
    Args:
        file: Uploaded file (image or document)
        upload_type: 'camera' or 'file'
        document_type: 'timetable' or 'scheme'
        student_id: Student ID (optional)
        class_id: Class ID (required for accurate subject mapping)
    
    Returns:
        {
            "success": bool,
            "message": str,
            "confidence": float,
            "warnings": [str],
            "data": {
                "entries": [...] or "topics": [...],
                "subjects": [...]
            }
        }
    """
    logger.info(
        f"📤 Document upload received: type={upload_type}, "
        f"document={document_type}, student_id={student_id}, class_id={class_id}"
    )
    
    try:
        # Validate inputs
        if upload_type not in ['camera', 'file']:
            raise HTTPException(status_code=400, detail="upload_type must be 'camera' or 'file'")
        
        if document_type not in ['timetable', 'scheme']:
            raise HTTPException(status_code=400, detail="document_type must be 'timetable' or 'scheme'")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="File is required")
        
        allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.txt'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        if len(content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=413, detail="File too large. Max 50MB allowed.")
        
        logger.info(f"📁 File received: {file.filename} ({len(content)} bytes)")
        
        # Save file temporarily
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
        temp_file.write(content)
        temp_file.close()
        
        try:
            # Process based on document type
            if document_type == 'timetable':
                result = await _process_timetable_upload(
                    temp_file.name,
                    upload_type,
                    student_id,
                    class_id,
                    db
                )
            else:  # scheme
                result = await _process_scheme_upload(
                    temp_file.name,
                    upload_type,
                    student_id,
                    class_id,
                    db
                )
            
            logger.info(f"✅ Document processed successfully")
            return result
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_file.name):
                os.remove(temp_file.name)
                
    except HTTPException as e:
        logger.error(f"❌ Validation error: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


async def _process_timetable_upload(
    file_path: str,
    upload_type: str,
    student_id: Optional[int],
    class_id: Optional[int],
    db: Session
):
    """Process timetable upload and extraction"""
    logger.info(f"🔄 Processing timetable upload from {upload_type}")
    
    try:
        # Extract timetable entries
        entries = timetable_extractor.extract_timetable(file_path)
        
        if not entries:
            logger.warning("⚠️ No timetable entries extracted")
            return {
                "success": False,
                "message": "Could not extract timetable data from document.",
                "recapture_needed": True,
                "tips": [
                    "Ensure the entire timetable is visible in the photo",
                    "Make sure lighting is good (no shadows on text)",
                    "Hold the camera perpendicular to the document",
                    "Avoid glare or reflections from the page"
                ]
            }
        
        logger.info(f"✅ Extracted {len(entries)} timetable entries")
        
        # Extract unique subjects
        unique_subjects = list(set(entry.subject for entry in entries))
        logger.info(f"📚 Found {len(unique_subjects)} unique subjects")
        
        # Map subjects to platform
        from app.domains.individual_processing import subject_mapper
        
        mapping_result = subject_mapper.map_subjects(
            extracted_subjects=unique_subjects,
            db=db,
            is_individual=True,
            class_id=class_id
        )
        
        # Calculate confidence
        total_subjects = len(mapping_result.matched_subjects) + len(mapping_result.unmatched_subjects)
        mapping_confidence = (
            len(mapping_result.matched_subjects) / total_subjects
            if total_subjects > 0
            else 0.0
        )
        
        # Average match confidence
        if mapping_result.matched_subjects:
            avg_confidence = sum(m.confidence for m in mapping_result.matched_subjects) / len(mapping_result.matched_subjects)
        else:
            avg_confidence = 0.0
        
        overall_confidence = (mapping_confidence * 0.5) + (avg_confidence * 0.5)
        
        # Prepare warnings
        warnings = []
        if mapping_result.unmatched_subjects:
            warnings.append(f"Could not map these subjects: {', '.join(mapping_result.unmatched_subjects)}")
        
        if len(entries) < 5:
            warnings.append("⚠️ Few periods extracted. Recapture with clearer image for better results.")
        
        if overall_confidence < 0.6:
            warnings.append("⚠️ Low confidence score. Some data may be inaccurate.")
        
        logger.info(f"📊 Confidence score: {overall_confidence:.2%}")
        
        return {
            "success": True,
            "message": "Timetable extracted successfully",
            "confidence": float(overall_confidence),
            "warnings": warnings,
            "recapture_needed": overall_confidence < 0.5,
            "data": {
                "entries": [
                    {
                        "day": e.day,
                        "period_number": e.period_number,
                        "start_time": e.start_time,
                        "end_time": e.end_time,
                        "subject": e.subject,
                        "level": e.level
                    }
                    for e in entries
                ],
                "subjects": unique_subjects,
                "total_periods": len(entries),
                "total_subjects": len(unique_subjects),
                "mapped_subjects": len(mapping_result.matched_subjects)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Timetable processing failed: {e}", exc_info=True)
        return {
            "success": False,
            "message": "Could not process timetable from document.",
            "recapture_needed": True,
            "tips": [
                "Try taking a clearer photo",
                "Improve lighting - shadows make text hard to read",
                "Ensure the document is fully visible",
                "Keep the camera steady while taking the photo"
            ],
            "technical_error": str(e)
        }


async def _process_scheme_upload(
    file_path: str,
    upload_type: str,
    student_id: Optional[int],
    class_id: Optional[int],
    db: Session
):
    """Process scheme of work upload and extraction"""
    logger.info(f"🔄 Processing scheme upload from {upload_type}")
    
    try:
        # Extract scheme topics
        topics = scheme_extractor.extract_scheme(file_path)
        
        if not topics:
            logger.warning("⚠️ No scheme topics extracted")
            return {
                "success": False,
                "message": "Could not extract scheme data from document.",
                "recapture_needed": True,
                "tips": [
                    "Ensure all pages of the scheme are photographed",
                    "Make sure text is clearly visible",
                    "Hold the camera perpendicular to the document",
                    "Avoid shadows and glare"
                ]
            }
        
        logger.info(f"✅ Extracted {len(topics)} scheme topics")
        
        # Extract unique subjects
        unique_subjects = list(set(topic.subject for topic in topics))
        logger.info(f"📚 Found {len(unique_subjects)} unique subjects")
        
        # Map subjects to platform
        from app.domains.individual_processing import subject_mapper
        
        mapping_result = subject_mapper.map_subjects(
            extracted_subjects=unique_subjects,
            db=db,
            is_individual=True
        )
        
        # Calculate confidence
        total_subjects = len(mapping_result.matched_subjects) + len(mapping_result.unmatched_subjects)
        mapping_confidence = (
            len(mapping_result.matched_subjects) / total_subjects
            if total_subjects > 0
            else 0.0
        )
        
        # Average match confidence
        if mapping_result.matched_subjects:
            avg_confidence = sum(m.confidence for m in mapping_result.matched_subjects) / len(mapping_result.matched_subjects)
        else:
            avg_confidence = 0.0
        
        overall_confidence = (mapping_confidence * 0.5) + (avg_confidence * 0.5)
        
        # Prepare warnings
        warnings = []
        if mapping_result.unmatched_subjects:
            warnings.append(f"Could not map these subjects: {', '.join(mapping_result.unmatched_subjects)}")
        
        if len(topics) < 5:
            warnings.append("⚠️ Few topics extracted. Recapture with clearer image for better results.")
        
        if overall_confidence < 0.6:
            warnings.append("⚠️ Low confidence score. Some data may be inaccurate.")
        
        logger.info(f"📊 Confidence score: {overall_confidence:.2%}")
        
        return {
            "success": True,
            "message": "Scheme extracted successfully",
            "confidence": float(overall_confidence),
            "warnings": warnings,
            "recapture_needed": overall_confidence < 0.5,
            "data": {
                "topics": [
                    {
                        "subject": t.subject,
                        "week": t.week_number,
                        "topic": t.topic_name,
                        "description": t.description
                    }
                    for t in topics
                ],
                "subjects": unique_subjects,
                "total_topics": len(topics),
                "total_subjects": len(unique_subjects),
                "mapped_subjects": len(mapping_result.matched_subjects)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Scheme processing failed: {e}", exc_info=True)
        return {
            "success": False,
            "message": "Could not process scheme from document.",
            "recapture_needed": True,
            "tips": [
                "Try taking a clearer photo",
                "Ensure all text is readable and in focus",
                "Improve lighting to make text clear",
                "Keep the camera steady"
            ],
            "technical_error": str(e)
        }