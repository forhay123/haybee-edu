"""
app/domains/individual_processing/subject_mapper.py
✅ UPDATED: Rejects low-confidence subjects instead of fallback
Only accepts high-confidence matches (≥70% or ≥85%)
"""
from typing import List, Dict, Tuple, Optional
import re
from sqlalchemy.orm import Session
from rapidfuzz import fuzz
from app.core.logger import get_logger
from app.domains.individual_processing import schemas
from app.models.subject import Subject

logger = get_logger(__name__)

# ✅ UPDATED: Single confidence threshold - reject below this
CONFIDENCE_THRESHOLD = 70.0  # Minimum confidence to accept (70% or 85%, your choice)
MIN_MATCH_SCORE = 70.0  # Consistent with threshold


def map_subjects(
    extracted_subjects: List[str],
    db: Session,
    is_individual: bool = True,
    class_id: Optional[int] = None
) -> schemas.SubjectMappingResult:
    """
    ✅ UPDATED: Maps extracted subject names to platform subjects.
    Only accepts high-confidence matches (≥70%).
    Low-confidence subjects are REJECTED and not included.
    
    Returns fewer subjects with 100% accuracy rather than all subjects with errors.
    """
    logger.info(
        f"🔍 [REJECT MODE] Mapping {len(extracted_subjects)} subjects "
        f"(individual: {is_individual}, class_id: {class_id})"
    )
    
    if not class_id:
        logger.warning("⚠️ class_id is None! Java service should send class_id in request.")
    
    # Get all platform subjects
    all_subjects = db.query(Subject).all()
    logger.info(f"📊 Total platform subjects: {len(all_subjects)}")
    
    # Get the student's grade
    student_grade = None
    if class_id:
        student_class = db.query(Subject).filter(Subject.class_id == class_id).first()
        if student_class:
            student_grade = student_class.grade
            logger.info(f"📚 Student grade: {student_grade}")
    
    # PRIORITY 1: Individual subjects in the same class + General Individual subjects
    if is_individual and class_id and student_grade:
        individual_class_subjects = [
            s for s in all_subjects 
            if 'Individual' in s.name 
            and s.class_id == class_id
        ]
        
        general_individual_subjects = [
            s for s in all_subjects
            if 'Individual' in s.name
            and s.grade == student_grade
            and s.department_id == 4
        ]
        
        combined_subjects = individual_class_subjects + general_individual_subjects
        
        logger.info(f"📊 Individual subjects in class {class_id}: {len(individual_class_subjects)}")
        logger.info(f"📊 General Individual subjects in grade {student_grade}: {len(general_individual_subjects)}")
        logger.info(f"📊 Total available subjects: {len(combined_subjects)}")
        
        if combined_subjects:
            result = _map_with_rejection(
                extracted_subjects,
                combined_subjects,
                db,
                student_grade,
                class_id,
                filter_description=f"Individual subjects (class {class_id} + General {student_grade})",
                boost_factor=1.15
            )
            
            if result.matched_subjects:
                logger.info(
                    f"✅ MAPPING COMPLETE: {len(result.matched_subjects)} accepted, "
                    f"{len(result.unmatched_subjects)} rejected"
                )
                return result
    
    # PRIORITY 2: All Individual subjects filtered by level
    if is_individual:
        individual_subjects = [s for s in all_subjects if 'Individual' in s.name]
        
        # Infer level (SSS vs JSS)
        level_filter = None
        
        if student_grade:
            if 'SSS' in student_grade.upper():
                level_filter = 'SSS'
            elif 'JSS' in student_grade.upper():
                level_filter = 'JSS'
        elif extracted_subjects:
            all_extracted_text = ' '.join(extracted_subjects).upper()
            if 'SSS' in all_extracted_text or 'SENIOR' in all_extracted_text:
                level_filter = 'SSS'
                logger.info("🔍 Inferred level: SSS from extracted subject names")
            elif 'JSS' in all_extracted_text or 'JUNIOR' in all_extracted_text:
                level_filter = 'JSS'
                logger.info("🔍 Inferred level: JSS from extracted subject names")
            else:
                level_filter = 'SSS'
                logger.info("🔍 Defaulting to SSS level")
        
        if level_filter:
            individual_subjects_filtered = [
                s for s in individual_subjects 
                if level_filter in s.name.upper()
            ]
            logger.info(f"📊 Individual {level_filter} subjects: {len(individual_subjects_filtered)}")
            
            if individual_subjects_filtered:
                result = _map_with_rejection(
                    extracted_subjects,
                    individual_subjects_filtered,
                    db,
                    student_grade,
                    class_id,
                    filter_description=f"Individual {level_filter} subjects",
                    boost_factor=1.15
                )
                
                if result.matched_subjects:
                    logger.info(
                        f"✅ MAPPING COMPLETE: {len(result.matched_subjects)} accepted, "
                        f"{len(result.unmatched_subjects)} rejected"
                    )
                    return result
        
        # Try all Individual subjects
        logger.info(f"📊 All Individual subjects: {len(individual_subjects)}")
        
        if individual_subjects:
            result = _map_with_rejection(
                extracted_subjects,
                individual_subjects,
                db,
                student_grade,
                class_id,
                filter_description="All Individual subjects",
                boost_factor=1.10
            )
            
            if result.matched_subjects:
                logger.info(
                    f"✅ MAPPING COMPLETE: {len(result.matched_subjects)} accepted, "
                    f"{len(result.unmatched_subjects)} rejected"
                )
                return result
    
    # ✅ FINAL: Return whatever we matched (might be empty)
    logger.warning(f"⚠️ No high-confidence matches found - returning empty result")
    return schemas.SubjectMappingResult(
        matched_subjects=[],
        unmatched_subjects=extracted_subjects
    )


def _map_with_rejection(
    extracted_subjects: List[str],
    platform_subjects: List[Subject],
    db: Session,
    student_grade: Optional[str],
    class_id: Optional[int],
    filter_description: str,
    boost_factor: float = 1.0
) -> schemas.SubjectMappingResult:
    """
    ✅ UPDATED: Only accepts high-confidence matches (≥70%).
    Low-confidence subjects are completely REJECTED.
    """
    if not platform_subjects:
        logger.warning("⚠️ No platform subjects to map against")
        return schemas.SubjectMappingResult(
            matched_subjects=[],
            unmatched_subjects=extracted_subjects
        )
    
    logger.info(f"🔍 [REJECT MODE] Mapping against {len(platform_subjects)} subjects ({filter_description})")
    
    accepted_matches = []
    rejected_subjects = []
    
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
        
        # ✅ DECISION: Accept or Reject
        if best_match and best_score >= CONFIDENCE_THRESHOLD:
            confidence_value = min(1.0, best_score / 100.0)
            
            # Additional semantic validation
            if _validate_subject_match(extracted_name, best_match.name):
                accepted_matches.append(schemas.SubjectMatch(
                    extracted_name=extracted_name,
                    platform_subject_id=best_match.id,
                    platform_subject_name=best_match.name,
                    confidence=confidence_value
                ))
                
                individual_marker = "🎯" if 'Individual' in best_match.name else ""
                logger.info(
                    f"✅ ACCEPTED {individual_marker} '{extracted_name}' → "
                    f"'{best_match.name}' ({best_score:.1f}% via {best_strategy})"
                )
            else:
                # Failed semantic validation - reject
                rejected_subjects.append(extracted_name)
                logger.warning(
                    f"❌ REJECTED (semantic): '{extracted_name}' → '{best_match.name}' "
                    f"({best_score:.1f}%)"
                )
        else:
            # Below confidence threshold - reject
            rejected_subjects.append(extracted_name)
            best_match_name = best_match.name if best_match else "None"
            logger.warning(
                f"❌ REJECTED (low confidence): '{extracted_name}' → '{best_match_name}' "
                f"({best_score:.1f}%)"
            )
    
    logger.info(
        f"📊 MAPPING RESULT: {len(accepted_matches)} accepted, "
        f"{len(rejected_subjects)} rejected"
    )
    
    return schemas.SubjectMappingResult(
        matched_subjects=accepted_matches,
        unmatched_subjects=rejected_subjects
    )


def _validate_subject_match(extracted_name: str, platform_name: str) -> bool:
    """
    Semantic validation to catch obvious mismatches.
    Returns False for clearly wrong matches (e.g., "Geography" → "Physics").
    """
    extracted_base = _extract_base_subject(extracted_name).lower()
    platform_base = _extract_base_subject(platform_name).lower()
    
    # Define subject groups that should NOT be matched to each other
    subject_groups = [
        {"math", "mathematics", "further math", "further maths"},
        {"english", "literature", "english language"},
        {"physics", "chemistry", "biology"},
        {"geography", "economics", "government", "civic"},
        {"commerce", "accounting", "financial accounting"},
        {"history", "christian religious studies", "islamic studies"},
    ]
    
    # Check if subjects are in different incompatible groups
    extracted_group = None
    platform_group = None
    
    for group in subject_groups:
        if any(subj in extracted_base for subj in group):
            extracted_group = group
        if any(subj in platform_base for subj in group):
            platform_group = group
    
    # If both are in identified groups and they're different = MISMATCH
    if extracted_group and platform_group and extracted_group != platform_group:
        logger.warning(
            f"🚫 SEMANTIC VALIDATION FAILED: '{extracted_name}' in group {extracted_group}, "
            f"but '{platform_name}' in group {platform_group}"
        )
        return False
    
    # Check critical keywords
    critical_keywords = {
        "math": ["math"],
        "english": ["english", "literature"],
        "physics": ["physics"],
        "chemistry": ["chemistry", "chem"],
        "biology": ["biology", "bio"],
        "geography": ["geography", "geo"],
        "economics": ["economics", "econ"],
        "commerce": ["commerce"],
        "accounting": ["accounting"],
        "government": ["government", "gov"],
        "civic": ["civic"],
        "literature": ["literature", "english"],
    }
    
    for keyword, required_terms in critical_keywords.items():
        if keyword in extracted_base:
            if not any(term in platform_base for term in required_terms):
                logger.warning(
                    f"🚫 KEYWORD VALIDATION FAILED: '{extracted_name}' has '{keyword}', "
                    f"but '{platform_name}' doesn't contain {required_terms}"
                )
                return False
    
    return True


def _calculate_match_scores(extracted: str, platform: str) -> Dict[str, float]:
    """Calculate multiple matching scores for better accuracy."""
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
    """Match by comparing base subject names (ignoring level/grade qualifiers)."""
    best_match = None
    best_score = 0.0
    
    clean_extracted = _extract_base_subject(extracted_name)
    
    for platform_subject in platform_subjects:
        clean_platform = _extract_base_subject(platform_subject.name)
        
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
    """
    if not subject_name:
        return ""
    
    name = subject_name.strip()
    
    # Remove content in parentheses
    name = re.sub(r'\(.*?\)', '', name).strip()
    
    # Remove known modifiers
    modifiers = [
        ' SSS1 ', ' SSS2 ', ' SSS3 ',
        ' JSS1 ', ' JSS2 ', ' JSS3 ',
        ' General', ' Science', ' Commercial', ' Art', ' HOME',
        ' Individual', ' ASPIRANT',
        'SSS1', 'SSS2', 'SSS3', 'JSS1', 'JSS2', 'JSS3',
        ' Revision', ' Practical',
        'Individual'
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
    """Get all subjects for a specific class."""
    if is_individual:
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