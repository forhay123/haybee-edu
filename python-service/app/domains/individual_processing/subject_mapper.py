"""
app/domains/individual_processing/subject_mapper.py
COMPLETE FIXED VERSION - Includes General department subjects for Individual students
"""
from typing import List, Dict, Tuple, Optional
import re
from sqlalchemy.orm import Session
from rapidfuzz import fuzz
from app.core.logger import get_logger
from app.domains.individual_processing import schemas
from app.models.subject import Subject

logger = get_logger(__name__)

# Confidence thresholds
CONFIDENCE_THRESHOLD = 70.0
MIN_MATCH_SCORE = 55.0


def map_subjects(
    extracted_subjects: List[str],
    db: Session,
    is_individual: bool = True,
    class_id: Optional[int] = None
) -> schemas.SubjectMappingResult:
    """
    Maps extracted subject names to platform subjects.
    FIXED: Includes General department subjects that are shared across all classes in the same grade.
    
    Mapping Strategy Priority (STRICT):
    1. Individual subjects in the SAME class (department-specific) - 15% boost
    2. General Individual subjects in the SAME grade (shared across departments) - 15% boost
    3. Individual subjects in other grades - 10% boost
    4. Non-individual subjects - ONLY AS LAST RESORT
    
    This ensures individual students get Individual-tagged subjects first, including
    General department subjects that are shared across all classes in their grade.
    """
    logger.info(
        f"🔍 Mapping {len(extracted_subjects)} subjects "
        f"(individual: {is_individual}, class_id: {class_id})"
    )
    
    # ⚠️ TEMPORARY FIX: If class_id is None, log warning
    if not class_id:
        logger.warning("⚠️ class_id is None! Java service should send class_id in request.")
        logger.warning("⚠️ Falling back to level-based filtering without class restriction.")
    
    # Get all platform subjects
    all_subjects = db.query(Subject).all()
    logger.info(f"📊 Total platform subjects: {len(all_subjects)}")
    
    # Get the student's grade (SSS1, SSS2, JSS1, etc.) from their class
    student_grade = None
    if class_id:
        student_class = db.query(Subject).filter(Subject.class_id == class_id).first()
        if student_class:
            student_grade = student_class.grade
            logger.info(f"📚 Student grade: {student_grade}")
    
    # PRIORITY 1: Individual subjects in the same class + General Individual subjects in the same grade
    if is_individual and class_id and student_grade:
        # Get department-specific Individual subjects for this class
        individual_class_subjects = [
            s for s in all_subjects 
            if 'Individual' in s.name 
            and s.class_id == class_id
        ]
        
        # Get General Individual subjects for this grade (department_id = 4, shared across all classes)
        general_individual_subjects = [
            s for s in all_subjects
            if 'Individual' in s.name
            and s.grade == student_grade
            and s.department_id == 4  # General department
        ]
        
        # Combine both lists
        combined_subjects = individual_class_subjects + general_individual_subjects
        
        logger.info(f"📊 Individual subjects in class {class_id}: {len(individual_class_subjects)}")
        logger.info(f"📊 General Individual subjects in grade {student_grade}: {len(general_individual_subjects)}")
        logger.info(f"📊 Total available subjects: {len(combined_subjects)}")
        
        if combined_subjects:
            result = _map_with_subjects(
                extracted_subjects,
                combined_subjects,
                is_individual=True,
                filter_description=f"Individual subjects (class {class_id} + General {student_grade})",
                boost_factor=1.15  # 15% boost for Individual + same grade
            )
            
            if result.matched_subjects:
                logger.info(f"✅ Found {len(result.matched_subjects)} matches in Individual subjects")
                
                # For any unmatched, try broader search
                if result.unmatched_subjects:
                    logger.info(f"🔄 Trying broader search for {len(result.unmatched_subjects)} unmatched subjects")
                    broader_result = _map_remaining_subjects(
                        result.unmatched_subjects,
                        all_subjects,
                        is_individual,
                        class_id,
                        student_grade
                    )
                    result.matched_subjects.extend(broader_result.matched_subjects)
                    result.unmatched_subjects = broader_result.unmatched_subjects
                
                return result
    
    # PRIORITY 2: All Individual subjects (any grade) - but filter by level if possible
    if is_individual:
        individual_subjects = [s for s in all_subjects if 'Individual' in s.name]
        
        # Try to infer the level (SSS vs JSS) 
        level_filter = None
        
        if student_grade:
            # Use student's actual grade
            if 'SSS' in student_grade.upper():
                level_filter = 'SSS'
            elif 'JSS' in student_grade.upper():
                level_filter = 'JSS'
        elif class_id:
            # Check the level of subjects in this class
            class_subject_sample = [s for s in all_subjects if s.class_id == class_id][:5]
            if class_subject_sample:
                for s in class_subject_sample:
                    if 'SSS' in s.name.upper():
                        level_filter = 'SSS'
                        break
                    elif 'JSS' in s.name.upper():
                        level_filter = 'JSS'
                        break
        
        # If no class_id, try to infer from extracted subject names
        if not level_filter and extracted_subjects:
            # Look for level indicators in extracted subject names
            all_extracted_text = ' '.join(extracted_subjects).upper()
            if 'SSS' in all_extracted_text or 'SENIOR' in all_extracted_text:
                level_filter = 'SSS'
                logger.info("🔍 Inferred level: SSS from extracted subject names")
            elif 'JSS' in all_extracted_text or 'JUNIOR' in all_extracted_text:
                level_filter = 'JSS'
                logger.info("🔍 Inferred level: JSS from extracted subject names")
            else:
                # Default to SSS for most individual students (they're usually senior secondary)
                level_filter = 'SSS'
                logger.info("🔍 Defaulting to SSS level (most individual students are senior secondary)")
        
        # Filter Individual subjects by level if determined
        if level_filter:
            individual_subjects_filtered = [
                s for s in individual_subjects 
                if level_filter in s.name.upper()
            ]
            logger.info(f"📊 Individual {level_filter} subjects: {len(individual_subjects_filtered)}")
            
            if individual_subjects_filtered:
                result = _map_with_subjects(
                    extracted_subjects,
                    individual_subjects_filtered,
                    is_individual=True,
                    filter_description=f"Individual {level_filter} subjects",
                    boost_factor=1.15  # Higher boost for level-matched subjects
                )
                
                if result.matched_subjects:
                    logger.info(f"✅ Found {len(result.matched_subjects)} matches in Individual {level_filter} subjects")
                    
                    # For unmatched, try all Individual subjects (any level)
                    if result.unmatched_subjects:
                        broader_result = _map_with_subjects(
                            result.unmatched_subjects,
                            individual_subjects,
                            is_individual=True,
                            filter_description="All Individual subjects (any level)",
                            boost_factor=1.05
                        )
                        result.matched_subjects.extend(broader_result.matched_subjects)
                        result.unmatched_subjects = broader_result.unmatched_subjects
                    
                    return result
        
        # No level filter or level-filtered search failed, try all Individual subjects
        logger.info(f"📊 All Individual subjects: {len(individual_subjects)}")
        
        if individual_subjects:
            result = _map_with_subjects(
                extracted_subjects,
                individual_subjects,
                is_individual=True,
                filter_description="All Individual subjects",
                boost_factor=1.10  # 10% boost for Individual subjects
            )
            
            if result.matched_subjects:
                logger.info(f"✅ Found {len(result.matched_subjects)} matches in Individual subjects")
                
                # For any unmatched, try all subjects as fallback
                if result.unmatched_subjects:
                    logger.warning(f"⚠️ {len(result.unmatched_subjects)} subjects not matched to Individual subjects")
                    logger.info(f"🔄 Trying all subjects as fallback")
                    broader_result = _map_with_subjects(
                        result.unmatched_subjects,
                        all_subjects,
                        is_individual=False,
                        filter_description="All subjects (fallback)",
                        boost_factor=1.0
                    )
                    result.matched_subjects.extend(broader_result.matched_subjects)
                    result.unmatched_subjects = broader_result.unmatched_subjects
                
                return result
    
    # PRIORITY 3: All subjects (fallback)
    logger.info(f"📊 Trying all {len(all_subjects)} subjects")
    return _map_with_subjects(
        extracted_subjects,
        all_subjects,
        is_individual=False,
        filter_description="All subjects",
        boost_factor=1.0
    )


def _map_remaining_subjects(
    unmatched_subjects: List[str],
    all_subjects: List[Subject],
    is_individual: bool,
    class_id: Optional[int],
    student_grade: Optional[str] = None
) -> schemas.SubjectMappingResult:
    """
    Helper to map remaining unmatched subjects with broader search.
    FIXED: Includes General department subjects.
    """
    # Try Individual subjects from the same grade (any department)
    if is_individual and student_grade:
        individual_same_grade = [
            s for s in all_subjects 
            if 'Individual' in s.name and s.grade == student_grade
        ]
        
        if individual_same_grade:
            result = _map_with_subjects(
                unmatched_subjects,
                individual_same_grade,
                is_individual=True,
                filter_description=f"Individual subjects (same grade {student_grade})",
                boost_factor=1.12
            )
            
            if result.matched_subjects:
                return result
    
    # Try Individual subjects from other grades
    if is_individual:
        individual_other_grades = [
            s for s in all_subjects 
            if 'Individual' in s.name and (not class_id or s.class_id != class_id)
        ]
        
        if individual_other_grades:
            result = _map_with_subjects(
                unmatched_subjects,
                individual_other_grades,
                is_individual=True,
                filter_description="Individual subjects (other grades)",
                boost_factor=1.08
            )
            
            if result.matched_subjects:
                return result
    
    # Final fallback: all subjects
    return _map_with_subjects(
        unmatched_subjects,
        all_subjects,
        is_individual=False,
        filter_description="All subjects (final fallback)",
        boost_factor=1.0
    )


def _map_with_subjects(
    extracted_subjects: List[str],
    platform_subjects: List[Subject],
    is_individual: bool,
    filter_description: str,
    boost_factor: float = 1.0
) -> schemas.SubjectMappingResult:
    """
    Internal function to perform actual mapping with given subject list.
    FIXED: Better boosting for Individual subjects
    """
    if not platform_subjects:
        logger.warning("⚠️ No platform subjects to map against")
        return schemas.SubjectMappingResult(
            matched_subjects=[],
            unmatched_subjects=extracted_subjects
        )
    
    logger.info(f"🔍 Mapping against {len(platform_subjects)} subjects ({filter_description})")
    
    matched = []
    unmatched = []
    
    for extracted_name in extracted_subjects:
        best_match = None
        best_score = 0.0
        best_strategy = ""
        
        # Strategy 1: Direct fuzzy matching
        for platform_subject in platform_subjects:
            scores = _calculate_match_scores(extracted_name, platform_subject.name)
            score = max(scores.values())
            
            # Apply boost factor
            if boost_factor > 1.0:
                score = min(100.0, score * boost_factor)
                scores['boosted'] = score
            
            if score > best_score:
                best_score = score
                best_match = platform_subject
                best_strategy = max(scores, key=scores.get)
        
        # Strategy 2: Base subject matching
        if best_score < CONFIDENCE_THRESHOLD:
            base_match, base_score = _match_by_base_subject(
                extracted_name,
                platform_subjects,
                boost_factor
            )
            
            if base_score > best_score:
                best_match = base_match
                best_score = base_score
                best_strategy = "base_subject"
        
        # Strategy 3: Code matching
        if best_score < CONFIDENCE_THRESHOLD and best_match and best_match.code:
            code_score = fuzz.ratio(
                extracted_name.lower().strip(),
                best_match.code.lower().strip()
            )
            
            if code_score * boost_factor > best_score:
                best_score = min(100.0, code_score * boost_factor)
                best_strategy = "code_match"
        
        # Check if match meets minimum threshold
        if best_match and best_score >= MIN_MATCH_SCORE:
            confidence_level = "✅ HIGH" if best_score >= CONFIDENCE_THRESHOLD else "⚠️ MEDIUM"
            confidence_value = min(1.0, best_score / 100.0)
            
            matched.append(schemas.SubjectMatch(
                extracted_name=extracted_name,
                platform_subject_id=best_match.id,
                platform_subject_name=best_match.name,
                confidence=confidence_value
            ))
            
            individual_marker = "🎯" if 'Individual' in best_match.name else ""
            logger.info(
                f"{confidence_level} {individual_marker} Matched '{extracted_name}' → "
                f"'{best_match.name}' ({best_score:.1f}% via {best_strategy})"
            )
        else:
            unmatched.append(extracted_name)
            best_match_name = best_match.name if best_match else "None"
            logger.warning(
                f"❌ No match for '{extracted_name}' "
                f"(best: {best_match_name} at {best_score:.1f}%)"
            )
    
    logger.info(f"📊 Mapping complete: {len(matched)} matched, {len(unmatched)} unmatched")
    
    return schemas.SubjectMappingResult(
        matched_subjects=matched,
        unmatched_subjects=unmatched
    )


def _calculate_match_scores(extracted: str, platform: str) -> Dict[str, float]:
    """
    Calculate multiple matching scores for better accuracy.
    """
    extracted_lower = extracted.lower().strip()
    platform_lower = platform.lower().strip()
    
    scores = {
        'exact': fuzz.ratio(extracted_lower, platform_lower),
        'partial': fuzz.partial_ratio(extracted_lower, platform_lower),
        'token_sort': fuzz.token_sort_ratio(extracted_lower, platform_lower),
        'token_set': fuzz.token_set_ratio(extracted_lower, platform_lower),
    }
    
    # Extract base subjects and compare
    base_extracted = _extract_base_subject(extracted)
    base_platform = _extract_base_subject(platform)
    
    if base_extracted and base_platform:
        scores['base_exact'] = fuzz.ratio(base_extracted.lower(), base_platform.lower())
        scores['base_partial'] = fuzz.partial_ratio(base_extracted.lower(), base_platform.lower())
    
    return scores


def _match_by_base_subject(
    extracted_name: str,
    platform_subjects: List[Subject],
    boost_factor: float = 1.0
) -> Tuple[Optional[Subject], float]:
    """
    Match by comparing base subject names (ignoring level/grade qualifiers).
    """
    best_match = None
    best_score = 0.0
    
    clean_extracted = _extract_base_subject(extracted_name)
    
    for platform_subject in platform_subjects:
        clean_platform = _extract_base_subject(platform_subject.name)
        
        # Calculate multiple scores
        exact_score = fuzz.ratio(clean_extracted.lower(), clean_platform.lower())
        partial_score = fuzz.partial_ratio(clean_extracted.lower(), clean_platform.lower())
        token_score = fuzz.token_sort_ratio(clean_extracted.lower(), clean_platform.lower())
        
        score = max(exact_score, partial_score, token_score)
        score = min(100.0, score * boost_factor)
        
        if score > best_score:
            best_score = score
            best_match = platform_subject
    
    return best_match, best_score


def _extract_base_subject(subject_name: str) -> str:
    """
    Extract base subject name, removing level/grade modifiers.
    
    Examples:
        "Mathematics SSS1 General" → "Mathematics"
        "English Language SSS2 Science Individual" → "English Language"
        "Economics (Revision)" → "Economics"
        "Mathematics Individual" → "Mathematics"
    """
    if not subject_name:
        return ""
    
    name = subject_name.strip()
    
    # Remove content in parentheses
    name = re.sub(r'\(.*?\)', '', name).strip()
    
    # Remove known modifiers (INCLUDING "Individual" for base comparison)
    modifiers = [
        ' SSS1 ', ' SSS2 ', ' SSS3 ',
        ' JSS1 ', ' JSS2 ', ' JSS3 ',
        ' General', ' Science', ' Commercial', ' Art', ' HOME',
        ' Individual', ' ASPIRANT',
        'SSS1', 'SSS2', 'SSS3', 'JSS1', 'JSS2', 'JSS3',
        ' Revision', ' Practical',
        'Individual'  # Remove this too for base subject comparison
    ]
    
    for modifier in modifiers:
        name = name.replace(modifier, ' ')
        name = name.replace(modifier.lower(), ' ')
    
    # Clean up extra spaces
    name = ' '.join(name.split())
    
    return name


def get_subjects_by_class(
    db: Session,
    class_id: int,
    is_individual: bool = True
) -> List[Dict]:
    """
    Get all subjects for a specific class.
    FIXED: Uses the new helper method to include General subjects
    """
    if is_individual:
        # Use the helper method that includes General subjects
        subjects = Subject.get_individual_subjects_for_class(db, class_id)
        
        return [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "level": s.level,
                "grade": s.grade,
                "compulsory": s.compulsory
            }
            for s in subjects
        ]
    
    # Fallback to all subjects in class
    subjects = db.query(Subject).filter(Subject.class_id == class_id).all()
    
    return [
        {
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "level": s.level,
            "grade": s.grade,
            "compulsory": s.compulsory
        }
        for s in subjects
    ]