# app/domains/lesson_processing/schemas.py
"""
Enhanced Pydantic schemas with workings support
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, HttpUrl


class LessonQuestionCreate(BaseModel):
    """Schema for creating a lesson question"""
    question_text: str
    answer_text: Optional[str] = None
    difficulty: Optional[str] = None
    max_score: Optional[int] = 1
    
    # Multiple-choice options
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_option: Optional[str] = None  # 'A', 'B', 'C', 'D'
    
    # ✅ NEW: Step-by-step workings
    workings: Optional[str] = None


class LessonAIResultCreate(BaseModel):
    """Schema for creating a lesson AI result"""
    lesson_topic_id: int
    subject_id: int
    week_number: int
    file_url: HttpUrl
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    questions: Optional[List[LessonQuestionCreate]] = []


class LessonQuestionResponse(BaseModel):
    """Schema for lesson question response"""
    id: int
    question_text: str
    answer_text: Optional[str]
    difficulty: Optional[str]
    max_score: Optional[int]
    option_a: Optional[str]
    option_b: Optional[str]
    option_c: Optional[str]
    option_d: Optional[str]
    correct_option: Optional[str]
    
    # ✅ NEW: Step-by-step workings
    workings: Optional[str]
    
    created_at: datetime

    model_config = {"from_attributes": True}


class LessonAIResultResponse(BaseModel):
    """Schema for lesson AI result response"""
    id: int
    lesson_topic_id: int
    subject_id: int
    week_number: int
    file_url: str
    extracted_text: Optional[str]
    summary: Optional[str]
    status: str
    progress: float
    created_at: datetime
    updated_at: datetime
    questions: List[LessonQuestionResponse] = []

    model_config = {"from_attributes": True}