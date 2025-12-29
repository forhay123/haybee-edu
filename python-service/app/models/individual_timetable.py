"""
app/models/individual_timetable.py
SQLAlchemy model for individual student timetables
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, BigInteger
from sqlalchemy.sql import func
from app.models.base import Base


class IndividualStudentTimetable(Base):
    """Stores uploaded timetable metadata for INDIVIDUAL students"""
    
    __tablename__ = 'individual_student_timetables'
    __table_args__ = {'schema': 'academic'}
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    student_profile_id = Column(Integer, nullable=False, index=True)
    term_id = Column(Integer, nullable=True)
    
    # File metadata
    original_filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)  # PDF, EXCEL, IMAGE
    file_size_bytes = Column(BigInteger, nullable=True)
    
    # Academic context
    academic_year = Column(String(20), nullable=True)
    
    # Processing status
    processing_status = Column(
        String(30), 
        nullable=False, 
        default='PENDING'
    )  # PENDING, PROCESSING, COMPLETED, FAILED
    
    processing_error = Column(Text, nullable=True)
    
    # AI extraction results
    total_periods_extracted = Column(Integer, nullable=True, default=0)
    subjects_identified = Column(Integer, nullable=True, default=0)
    confidence_score = Column(Float, nullable=True)  # 0.00 to 100.00
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<IndividualTimetable(id={self.id}, student={self.student_profile_id}, status={self.processing_status})>"
    
    # Helper methods matching Java entity
    def is_processed(self):
        return self.processing_status == 'COMPLETED'
    
    def is_failed(self):
        return self.processing_status == 'FAILED'
    
    def is_pending(self):
        return self.processing_status == 'PENDING'
    
    def is_processing(self):
        return self.processing_status == 'PROCESSING'
    
    def mark_as_processing(self):
        self.processing_status = 'PROCESSING'
    
    def mark_as_completed(self):
        self.processing_status = 'COMPLETED'
        self.processed_at = func.now()
    
    def mark_as_failed(self, error: str):
        self.processing_status = 'FAILED'
        self.processing_error = error
        self.processed_at = func.now()