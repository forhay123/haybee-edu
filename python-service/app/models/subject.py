"""
app/models/subject.py
Python SQLAlchemy model that matches Java Subject entity exactly
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship, Session
from app.models.base import Base


class Subject(Base):
    """
    Subject model - EXACTLY matches Java Subject entity
    
    IMPORTANT: General department subjects (department_id = 4) are shared across
    ALL classes in the same grade level. For example:
    - MTH431 (Mathematics SSS1 General Individual) belongs to class 43 (SSS1 General)
      BUT is available to ALL SSS1 classes (Science, Commercial, Art)
    - This is because General subjects are not department-specific
    
    Fields:
    - level: Broad level (JUNIOR or SENIOR)
    - grade: Specific grade within level (JSS1, JSS2, JSS3, SSS1, SSS2, SSS3)
      ✅ This allows querying across departments at same grade!
    """
    __tablename__ = "subjects"
    __table_args__ = {"schema": "academic"}

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Info
    name = Column(String(100), nullable=False)
    code = Column(String(50))
    
    # Level Classification
    level = Column(String(20), nullable=False)  # JUNIOR or SENIOR
    grade = Column(String(10), nullable=False)  # JSS1, JSS2, JSS3, SSS1, SSS2, SSS3
    
    # Compulsory Flag
    compulsory = Column(Boolean, name="is_compulsory")
    
    # Foreign Keys
    department_id = Column(Integer, ForeignKey("academic.departments.id"))
    # department_id values:
    # 1: Science
    # 2: Commercial  
    # 3: Art
    # 4: General (SHARED across all departments in the same grade)
    
    class_id = Column(Integer, ForeignKey("academic.classes.id"))
    
    # Relationships
    # Note: Java uses @ManyToOne with LAZY fetch
    # We don't add back_populates to avoid circular imports and match Java behavior
    # department = relationship("Department")  # Uncomment if needed
    # class_entity = relationship("ClassEntity")  # Uncomment if needed
    
    def __repr__(self):
        return f"<Subject(id={self.id}, name='{self.name}', code='{self.code}', grade='{self.grade}')>"
    
    @staticmethod
    def get_individual_subjects_for_class(db: Session, class_id: int):
        """
        Get ALL Individual subjects available to a student in a specific class.
        
        This includes:
        1. Department-specific Individual subjects in their class
        2. General Individual subjects in their grade (shared across all departments)
        
        Example:
        - Student in SSS1 Art (class_id: 46) gets:
          - LIT431, CRS431, GOV431, HIS431 (class 46 - Art department subjects)
          - MTH431, ENG431, CIV431, BKK431 (class 43 - General department subjects for SSS1)
        
        Args:
            db: SQLAlchemy database session
            class_id: The student's class ID
            
        Returns:
            List of Subject objects available to the student
        """
        # First, get the student's grade from any subject in their class
        sample_subject = db.query(Subject).filter(Subject.class_id == class_id).first()
        
        if not sample_subject:
            return []
        
        student_grade = sample_subject.grade  # e.g., "SSS1"
        
        # Query 1: Get department-specific Individual subjects for this class
        class_subjects = db.query(Subject).filter(
            Subject.class_id == class_id,
            Subject.name.contains('Individual')
        ).all()
        
        # Query 2: Get General Individual subjects for this grade
        # These are shared across ALL classes in the same grade
        general_subjects = db.query(Subject).filter(
            Subject.grade == student_grade,
            Subject.department_id == 4,  # General department
            Subject.name.contains('Individual')
        ).all()
        
        # Combine both lists
        all_subjects = class_subjects + general_subjects
        
        # Remove duplicates (use subject ID as key)
        unique_subjects = {s.id: s for s in all_subjects}
        
        return list(unique_subjects.values())
    
    @staticmethod
    def get_subjects_by_grade_and_department(
        db: Session, 
        grade: str, 
        department_id: int,
        individual_only: bool = True
    ):
        """
        Get subjects for a specific grade and department.
        Useful for querying without knowing the exact class_id.
        
        Args:
            db: SQLAlchemy database session
            grade: The grade level (e.g., "SSS1", "JSS2")
            department_id: The department ID (1=Science, 2=Commercial, 3=Art, 4=General)
            individual_only: If True, only return subjects with "Individual" in name
            
        Returns:
            List of Subject objects
        """
        query = db.query(Subject).filter(
            Subject.grade == grade,
            Subject.department_id == department_id
        )
        
        if individual_only:
            query = query.filter(Subject.name.contains('Individual'))
        
        return query.all()
    
    @staticmethod
    def search_subjects_by_name(
        db: Session,
        search_term: str,
        grade: str = None,
        individual_only: bool = True
    ):
        """
        Search subjects by name with optional grade filter.
        
        Args:
            db: SQLAlchemy database session
            search_term: Term to search in subject name
            grade: Optional grade filter (e.g., "SSS1")
            individual_only: If True, only return Individual subjects
            
        Returns:
            List of matching Subject objects
        """
        query = db.query(Subject).filter(
            Subject.name.ilike(f'%{search_term}%')
        )
        
        if grade:
            query = query.filter(Subject.grade == grade)
        
        if individual_only:
            query = query.filter(Subject.name.contains('Individual'))
        
        return query.all()