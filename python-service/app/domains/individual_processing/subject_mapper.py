"""
app/domains/individual_processing/subject_mapper.py
ULTRA-SAFE VERSION - Strict validation to prevent ANY wrong assignments
"""
from typing import List, Dict, Tuple, Optional
import re
from sqlalchemy.orm import Session
from rapidfuzz import fuzz
from app.core.logger import get_logger
from app.domains.individual_processing import schemas
from app.models.subject import Subject

logger = get_logger(__name__)

# STRICT Confidence thresholds - NO COMPROMISES
CONFIDENCE_THRESHOLD = 85.0  # High confidence required
MIN_MATCH_SCORE = 80.0  # Very strict minimum
SAFE_FALLBACK_THRESHOLD = 85.0  # Anything below this = FALLBACK

# Fallback subject names (will find appropriate Individual versions)
FALLBACK_SUBJECTS = ["Mathematics", "English Language", "English"]


def map_subjects(
    extracted_subjects: List[str],
    db: Session,
    is_individual: bool = True,
    class_id: Optional[int] = None
) -> schemas.SubjectMappingResult:
    """
    Maps extracted subject names to platform subjects.
    ULTRA-SAFE VERSION: Only accepts very high confidence matches (≥85%).
    Anything below 85% = IMMEDIATE FALLBACK to Math/English.
    
    This ensures ZERO wrong assignments - we'd rather give Math/English
    than assign incorrect subjects that lead to wrong topics.
    """
    logger.info(
        f"🔍 [ULTRA-SAFE MODE] Mapping {len(extracted_subjects)} subjects "
        f"(individual: {is_individual}, class_id: {class_id})"
    )
    
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
            result = _map_with_strict_validation(
                extracted_subjects,
                combined_subjects,
                db,
                student_grade,
                class_id,
                filter_description=f"Individual subjects (class {class_id} + General {student_grade})",
                boost_factor=1.15
            )
            
            if result.matched_subjects or result.unmatched_subjects:
                logger.info(
                    f"✅ STRICT MAPPING: {len(result.matched_subjects)} high-confidence, "
                    f"{len(result.unmatched_subjects)} fallback"
                )
                return result
    
    # PRIORITY 2: All Individual subjects (any grade) - but filter by level if possible
    if is_individual:
        individual_subjects = [s for s in all_subjects if 'Individual' in s.name]
        
        # Try to infer the level (SSS vs JSS) 
        level_filter = None
        
        if student_grade:
            if 'SSS' in student_grade.upper():
                level_filter = 'SSS'
            elif 'JSS' in student_grade.upper():
                level_filter = 'JSS'
        elif class_id:
            class_subject_sample = [s for s in all_subjects if s.class_id == class_id][:5]
            if class_subject_sample:
                for s in class_subject_sample:
                    if 'SSS' in s.name.upper():
                        level_filter = 'SSS'
                        break
                    elif 'JSS' in s.name.upper():
                        level_filter = 'JSS'
                        break
        
        if not level_filter and extracted_subjects:
            all_extracted_text = ' '.join(extracted_subjects).upper()
            if 'SSS' in all_extracted_text or 'SENIOR' in all_extracted_text:
                level_filter = 'SSS'
                logger.info("🔍 Inferred level: SSS from extracted subject names")
            elif 'JSS' in all_extracted_text or 'JUNIOR' in all_extracted_text:
                level_filter = 'JSS'
                logger.info("🔍 Inferred level: JSS from extracted subject names")
            else:
                level_filter = 'SSS'
                logger.info("🔍 Defaulting to SSS level (most individual students are senior secondary)")
        
        if level_filter:
            individual_subjects_filtered = [
                s for s in individual_subjects 
                if level_filter in s.name.upper()
            ]
            logger.info(f"📊 Individual {level_filter} subjects: {len(individual_subjects_filtered)}")
            
            if individual_subjects_filtered:
                result = _map_with_strict_validation(
                    extracted_subjects,
                    individual_subjects_filtered,
                    db,
                    student_grade,
                    class_id,
                    filter_description=f"Individual {level_filter} subjects",
                    boost_factor=1.15
                )
                
                if result.matched_subjects or result.unmatched_subjects:
                    logger.info(
                        f"✅ STRICT MAPPING: {len(result.matched_subjects)} high-confidence, "
                        f"{len(result.unmatched_subjects)} fallback"
                    )
                    return result
        
        # Try all Individual subjects
        logger.info(f"📊 All Individual subjects: {len(individual_subjects)}")
        
        if individual_subjects:
            result = _map_with_strict_validation(
                extracted_subjects,
                individual_subjects,
                db,
                student_grade,
                class_id,
                filter_description="All Individual subjects",
                boost_factor=1.10
            )
            
            if result.matched_subjects or result.unmatched_subjects:
                logger.info(
                    f"✅ STRICT MAPPING: {len(result.matched_subjects)} high-confidence, "
                    f"{len(result.unmatched_subjects)} fallback"
                )
                return result
    
    # FINAL FALLBACK: All subjects go to Math/English
    logger.warning(f"⚠️ ALL {len(extracted_subjects)} subjects using SAFE FALLBACK (Math/English)")
    return _assign_fallback_subjects(extracted_subjects, db, student_grade, class_id)


def _map_with_strict_validation(
    extracted_subjects: List[str],
    platform_subjects: List[Subject],
    db: Session,
    student_grade: Optional[str],
    class_id: Optional[int],
    filter_description: str,
    boost_factor: float = 1.0
) -> schemas.SubjectMappingResult:
    """
    STRICT validation: Only accepts ≥85% confidence matches.
    Everything else goes to fallback (Math/English).
    """
    if not platform_subjects:
        logger.warning("⚠️ No platform subjects to map against - using fallback")
        return _assign_fallback_subjects(extracted_subjects, db, student_grade, class_id)
    
    logger.info(f"🔍 [STRICT] Mapping against {len(platform_subjects)} subjects ({filter_description})")
    
    high_confidence_matches = []
    needs_fallback = []
    
    for extracted_name in extracted_subjects:
        best_match = None
        best_score = 0.0
        best_strategy = ""
        
        # Strategy 1: Direct fuzzy matching with STRICT threshold
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
        
        # STRICT VALIDATION: Must be ≥85% to accept
        if best_match and best_score >= SAFE_FALLBACK_THRESHOLD:
            confidence_value = min(1.0, best_score / 100.0)
            
            # Additional safety check: validate the match makes semantic sense
            if _validate_subject_match(extracted_name, best_match.name):
                high_confidence_matches.append(schemas.SubjectMatch(
                    extracted_name=extracted_name,
                    platform_subject_id=best_match.id,
                    platform_subject_name=best_match.name,
                    confidence=confidence_value
                ))
                
                individual_marker = "🎯" if 'Individual' in best_match.name else ""
                logger.info(
                    f"✅ HIGH CONFIDENCE {individual_marker} '{extracted_name}' → "
                    f"'{best_match.name}' ({best_score:.1f}% via {best_strategy})"
                )
            else:
                # Failed semantic validation
                needs_fallback.append(extracted_name)
                logger.warning(
                    f"⚠️ SEMANTIC MISMATCH: '{extracted_name}' → '{best_match.name}' "
                    f"({best_score:.1f}%) - using FALLBACK"
                )
        else:
            # Below 85% threshold
            needs_fallback.append(extracted_name)
            best_match_name = best_match.name if best_match else "None"
            logger.warning(
                f"⚠️ LOW CONFIDENCE: '{extracted_name}' → '{best_match_name}' "
                f"({best_score:.1f}%) - using FALLBACK"
            )
    
    # Assign fallback subjects for all low-confidence matches
    if needs_fallback:
        fallback_result = _assign_fallback_subjects(needs_fallback, db, student_grade, class_id)
        high_confidence_matches.extend(fallback_result.matched_subjects)
    
    logger.info(
        f"📊 STRICT MAPPING: {len(high_confidence_matches)} total "
        f"({len(high_confidence_matches) - len(needs_fallback)} high-confidence, "
        f"{len(needs_fallback)} fallback)"
    )
    
    return schemas.SubjectMappingResult(
        matched_subjects=high_confidence_matches,
        unmatched_subjects=[]  # Everything is either matched or has fallback
    )


def _validate_subject_match(extracted_name: str, platform_name: str) -> bool:
    """
    Semantic validation to catch obvious mismatches.
    Returns False for clearly wrong matches (e.g., "Geography" → "Physics").
    """
    # Extract base subjects for comparison
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
    
    # If both are in identified groups and they're different groups = MISMATCH
    if extracted_group and platform_group and extracted_group != platform_group:
        logger.warning(
            f"🚫 SEMANTIC VALIDATION FAILED: '{extracted_name}' in group {extracted_group}, "
            f"but '{platform_name}' in group {platform_group}"
        )
        return False
    
    # Additional check: if extracted name has specific keyword, platform must have it too
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
    
    # Passed all validations
    return True


def _assign_fallback_subjects(
    subject_names: List[str],
    db: Session,
    student_grade: Optional[str] = None,
    class_id: Optional[int] = None
) -> schemas.SubjectMappingResult:
    """
    Assign Mathematics or English Language as fallback for unmapped subjects.
    Alternates between Math and English for multiple subjects.
    """
    if not subject_names:
        return schemas.SubjectMappingResult(matched_subjects=[], unmatched_subjects=[])
    
    logger.info(f"🔄 [FALLBACK] Assigning Math/English for {len(subject_names)} subjects")
    
    # Find appropriate Math and English subjects
    all_subjects = db.query(Subject).all()
    
    # Try to find Individual Math and English for the student's grade
    math_subject = None
    english_subject = None
    
    if student_grade:
        # Look for Individual subjects in the same grade
        for subject in all_subjects:
            if 'Individual' in subject.name and subject.grade == student_grade:
                subject_base = _extract_base_subject(subject.name).lower()
                if 'math' in subject_base and not math_subject:
                    math_subject = subject
                elif 'english' in subject_base and not english_subject:
                    english_subject = subject
    
    # Fallback to any Individual Math/English if grade-specific not found
    if not math_subject or not english_subject:
        for subject in all_subjects:
            if 'Individual' in subject.name:
                subject_base = _extract_base_subject(subject.name).lower()
                if 'math' in subject_base and not math_subject:
                    math_subject = subject
                elif 'english' in subject_base and not english_subject:
                    english_subject = subject
    
    # Last resort: any Math/English subject
    if not math_subject:
        for subject in all_subjects:
            if 'math' in subject.name.lower():
                math_subject = subject
                break
    
    if not english_subject:
        for subject in all_subjects:
            if 'english' in subject.name.lower():
                english_subject = subject
                break
    
    matched = []
    unmatched = []
    
    for i, subject_name in enumerate(subject_names):
        # Alternate between Math and English
        fallback_subject = math_subject if i % 2 == 0 else english_subject
        
        if fallback_subject:
            matched.append(schemas.SubjectMatch(
                extracted_name=subject_name,
                platform_subject_id=fallback_subject.id,
                platform_subject_name=fallback_subject.name,
                confidence=0.50  # Mark as fallback with 50% confidence
            ))
            logger.info(
                f"🔄 FALLBACK ASSIGNED: '{subject_name}' → '{fallback_subject.name}' "
                f"(ID: {fallback_subject.id}) [50% confidence marker]"
            )
        else:
            unmatched.append(subject_name)
            logger.error(
                f"❌ CRITICAL ERROR: Could not find fallback subject for '{subject_name}' "
                f"- Math or English must exist in database!"
            )
    
    logger.info(f"✅ Fallback complete: {len(matched)} assigned, {len(unmatched)} failed")
    
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
    """
    Get all subjects for a specific class.
    FIXED: Uses the new helper method to include General subjects
    """
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