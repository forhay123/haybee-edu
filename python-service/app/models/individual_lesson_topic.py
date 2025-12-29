"""
app/models/individual_lesson_topic.py
SQLAlchemy model for individual lesson topics extracted from schemes
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.sql import func
from app.models.base import Base


class IndividualLessonTopic(Base):
    """Stores extracted lesson topics from scheme of work for INDIVIDUAL students"""
    
    __tablename__ = 'individual_lesson_topics'
    __table_args__ = {'schema': 'academic'}
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    student_profile_id = Column(Integer, nullable=False, index=True)
    scheme_id = Column(Integer, ForeignKey('academic.individual_student_schemes.id'), nullable=False)
    subject_id = Column(Integer, nullable=False, index=True)
    term_id = Column(Integer, nullable=True)
    
    # Topic details
    topic_title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    week_number = Column(Integer, nullable=True)
    
    # Subject mapping (AI-generated)
    mapped_subject_id = Column(Integer, nullable=True)  # Platform subject after mapping
    mapping_confidence = Column(Float, nullable=True)  # 0.00 to 100.00
    
    # Learning resources
    file_name = Column(String(255), nullable=True)
    file_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<IndividualLessonTopic(id={self.id}, student={self.student_profile_id}, week={self.week_number}, topic='{self.topic_title[:30]}')>"
    
    # Helper methods matching Java entity
    def has_high_mapping_confidence(self):
        """Check if mapping confidence is high (>= 80%)"""
        return self.mapping_confidence is not None and self.mapping_confidence >= 80.0
    
    def is_mapping_approved(self):
        """Check if this topic has been manually reviewed/approved"""
        return self.mapped_subject_id is not None