from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class Term(Base):
    """Term model - matches Java Term entity"""
    __tablename__ = "terms"
    __table_args__ = {"schema": "academic"}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    
    # Foreign Keys
    session_id = Column(Integer, ForeignKey("academic.school_sessions.id"))
    
    # Relationships - DON'T add lesson_topics or live_sessions
    # Java doesn't have @OneToMany for these