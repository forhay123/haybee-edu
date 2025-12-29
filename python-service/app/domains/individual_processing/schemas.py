"""
app/domains/individual_processing/schemas.py
Pydantic schemas for individual student document processing
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


# ============================================================
# COMMON PROCESSING STATUS
# ============================================================
class ProcessingStatus(BaseModel):
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    message: Optional[str] = None
    processed_at: Optional[datetime] = None


# ============================================================
# REQUEST SCHEMAS (from Java)
# ============================================================

class TimetableUploadRequest(BaseModel):
    """Request from Java when timetable is uploaded"""
    timetable_id: int = Field(..., description="ID of the timetable record in Java DB")
    student_id: int = Field(..., description="Student profile ID")
    class_id: Optional[int] = Field(None, description="Class/Grade ID") 
    file_url: str = Field(..., description="Full file path on disk or URL to download")
    original_filename: Optional[str] = None
    academic_year: Optional[str] = None
    term_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "timetable_id": 1,
                "student_id": 8,
                "file_url": "uploads/individual/timetables/abc123.pdf",
                "original_filename": "my_timetable.pdf",
                "academic_year": "2024/2025",
                "term_id": 1
            }
        }


class SchemeUploadRequest(BaseModel):
    """Request from Java when scheme of work is uploaded"""
    scheme_id: int = Field(..., description="ID of the scheme record in Java DB")
    student_id: int = Field(..., description="Student profile ID")
    file_url: str = Field(..., description="Full file path on disk or URL to download")
    subject_id: Optional[int] = None
    original_filename: Optional[str] = None
    academic_year: Optional[str] = None
    term_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "scheme_id": 1,
                "student_id": 8,
                "subject_id": 5,
                "file_url": "uploads/individual/schemes/xyz789.pdf",
                "original_filename": "mathematics_scheme.pdf",
                "academic_year": "2024/2025",
                "term_id": 1
            }
        }


class SubjectMappingRequest(BaseModel):
    """Request to map extracted subject names to platform subjects"""
    student_id: int = Field(..., description="Student profile ID")
    extracted_subjects: List[str] = Field(..., description="List of subject names from document")

    class Config:
        json_schema_extra = {
            "example": {
                "student_id": 8,
                "extracted_subjects": ["Mathematics", "English Language", "Physics"]
            }
        }


# ============================================================
# EXTRACTION RESULT SCHEMAS
# ============================================================

class DayOfWeek(str, Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"


class TimetableEntry(BaseModel):
    """Single timetable entry (one period)"""
    day: str  # Monday, Tuesday, etc.
    period_number: Optional[int] = Field(None, description="Period number (1-8)")
    start_time: str = Field(..., description="Start time (HH:MM)")
    end_time: str = Field(..., description="End time (HH:MM)")
    subject: str = Field(..., description="Subject name as extracted")
    subject_code: Optional[str] = Field(None, description="Subject code if found")
    teacher: Optional[str] = Field(None, description="Teacher name if found")
    room: Optional[str] = Field(None, description="Room/location if found")
    level: Optional[str] = None  # Optional, e.g., 'JSS2', 'SS3'

    class Config:
        json_schema_extra = {
            "example": {
                "day": "MONDAY",
                "period_number": 1,
                "start_time": "08:00",
                "end_time": "09:00",
                "subject": "Mathematics",
                "subject_code": "MTH101",
                "teacher": "Mr. Johnson",
                "room": "Room 12",
                "level": "JSS2"
            }
        }


class SchemeTopic(BaseModel):
    """Single topic from scheme of work"""
    week_number: int = Field(..., alias="week", description="Week number in term")
    topic: str = Field(..., description="Main topic")
    subtopics: List[str] = Field(default_factory=list, description="Subtopics under main topic")
    subject: str = Field(..., description="Subject name")
    duration: Optional[str] = Field(None, description="Duration/periods if specified")
    objectives: Optional[List[str]] = Field(None, alias="learning_objectives", description="Learning objectives if found")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "week": 1,
                "topic": "Introduction to Algebra",
                "subtopics": ["Variables and Constants", "Basic Operations"],
                "subject": "Mathematics",
                "duration": "4 periods",
                "learning_objectives": ["Understand algebraic notation", "Perform basic operations"]
            }
        }


class SubjectMatch(BaseModel):
    """Matched subject from platform"""
    extracted_name: str = Field(..., description="Original extracted subject name")
    platform_subject_id: Optional[int] = Field(None, description="Platform subject ID")
    platform_subject_name: Optional[str] = Field(None, description="Platform subject name")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Confidence score (0-1)")

    class Config:
        json_schema_extra = {
            "example": {
                "extracted_name": "Maths",
                "platform_subject_id": 5,
                "platform_subject_name": "Mathematics",
                "confidence": 0.95
            }
        }


class SubjectMappingResult(BaseModel):
    """Result of subject mapping"""
    matched_subjects: List[SubjectMatch] = Field(default_factory=list)
    unmatched_subjects: List[str] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "matched_subjects": [
                    {
                        "extracted_name": "Maths",
                        "platform_subject_id": 5,
                        "platform_subject_name": "Mathematics",
                        "confidence": 0.95
                    }
                ],
                "unmatched_subjects": ["Unknown Subject"]
            }
        }


class TimetableExtractionResult(BaseModel):
    """Complete result of timetable extraction"""
    timetable_id: int
    student_id: int
    total_periods_extracted: int
    subjects_identified: int
    entries: List[TimetableEntry]
    subjects_detected: List[str]
    subject_mapping: SubjectMappingResult
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0, alias="extraction_accuracy")
    processing_status: Optional[ProcessingStatus] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "timetable_id": 1,
                "student_id": 8,
                "total_periods_extracted": 40,
                "subjects_identified": 8,
                "entries": [],
                "subjects_detected": ["Mathematics", "English", "Physics"],
                "subject_mapping": {
                    "matched_subjects": [],
                    "unmatched_subjects": []
                },
                "extraction_accuracy": 0.87
            }
        }


class SchemeExtractionResult(BaseModel):
    """Complete result of scheme extraction"""
    scheme_id: int
    student_id: int
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    total_topics_extracted: int
    weeks_covered: int
    topics: List[SchemeTopic]
    subject_mapping: SubjectMappingResult
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0, alias="extraction_accuracy")
    processing_status: Optional[ProcessingStatus] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "scheme_id": 1,
                "student_id": 8,
                "subject_id": 5,
                "subject_name": "Mathematics",
                "total_topics_extracted": 12,
                "weeks_covered": 12,
                "topics": [],
                "subject_mapping": {
                    "matched_subjects": [],
                    "unmatched_subjects": []
                },
                "extraction_accuracy": 0.92
            }
        }


# ============================================================
# STATUS UPDATE SCHEMAS (callbacks to Java)
# ============================================================

class ProcessingStatusUpdate(BaseModel):
    """Status update to send back to Java"""
    status: str = Field(..., description="PENDING | PROCESSING | COMPLETED | FAILED")
    error: Optional[str] = Field(None, description="Error message if failed")
    total_periods: Optional[int] = Field(None, description="Total periods extracted")
    subjects_count: Optional[int] = Field(None, description="Number of subjects identified")
    total_topics: Optional[int] = Field(None, description="Total topics extracted (schemes)")
    weeks_count: Optional[int] = Field(None, description="Number of weeks covered (schemes)")
    confidence: Optional[float] = Field(None, description="Confidence score")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "COMPLETED",
                "total_periods": 40,
                "subjects_count": 8,
                "confidence": 0.87
            }
        }


# ============================================================
# RESPONSE FOR JAVA CALLBACK
# ============================================================
class ProcessingCallbackResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None