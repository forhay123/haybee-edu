"""
app/domains/individual_processing/document_upload_service.py
NEW FILE - Service to handle document upload metadata and storage
FIXED: Removed image quality assessment (requires OpenCV which is now fixed)
"""
from datetime import datetime
from typing import Optional
from enum import Enum
import os

from app.core.logger import get_logger

logger = get_logger(__name__)


class UploadType(str, Enum):
    CAMERA = "camera"
    FILE = "file"
    URL = "url"


class DocumentType(str, Enum):
    TIMETABLE = "timetable"
    SCHEME = "scheme"


class DocumentUploadService:
    """Service to manage document uploads"""
    
    def __init__(self):
        self.uploads_dir = os.getenv("UPLOADS_DIR", "/app/uploads")
        os.makedirs(self.uploads_dir, exist_ok=True)
        logger.info(f"📁 Uploads directory: {self.uploads_dir}")
    
    def get_upload_path(self, upload_type: UploadType, document_type: DocumentType, filename: str) -> str:
        """Generate upload path for file"""
        subdir = os.path.join(self.uploads_dir, upload_type.value, document_type.value)
        os.makedirs(subdir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name, ext = os.path.splitext(filename)
        final_name = f"{name}_{timestamp}{ext}"
        
        return os.path.join(subdir, final_name)
    
    def validate_file_size(self, file_size: int, max_size_mb: int = 50) -> bool:
        """Validate file size"""
        max_bytes = max_size_mb * 1024 * 1024
        return file_size <= max_bytes
    
    def validate_file_type(self, filename: str, allowed_types: list = None) -> bool:
        """Validate file extension"""
        if allowed_types is None:
            allowed_types = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.txt']
        
        _, ext = os.path.splitext(filename)
        return ext.lower() in allowed_types
    
    def log_upload(self, upload_type: str, document_type: str, student_id: Optional[int], 
                   success: bool, confidence: float = 0.0, entries_count: int = 0):
        """Log upload for analytics"""
        status = "✅ SUCCESS" if success else "❌ FAILED"
        logger.info(
            f"{status} {upload_type.upper()} upload - Document: {document_type}, "
            f"Student: {student_id}, Confidence: {confidence:.2%}, Entries: {entries_count}"
        )