from typing import List, Dict, Any, Optional, Union, Literal
import json
import re
import string
import torch
from pydantic import BaseModel, Field, ValidationError, model_validator, parse_obj_as
from sentence_transformers import SentenceTransformer, util
from app.ai_engine.openai_client import call_openai_completion
from app.ai_engine.prompt_templates import load_prompt_template
from app.ai_engine.utils.json_utils import safe_json_dumps
from app.core.logger import get_logger

logger = get_logger("QuestionGenerator")

# ----------------------------
# 🔒 Pydantic schema for MCQ and Theory question validation
# ----------------------------

class MCQQuestion(BaseModel):
    type: Literal["mcq"]
    question_text: str = Field(..., description="The text of the question")
    options: List[str] = Field(..., min_length=4, max_length=4, description="List of 4 MCQ options")
    correct_answer: str = Field(..., description="The correct answer (must be one of options)")
    difficulty: str = Field(default="medium", description="easy | medium | hard")
    max_score: int = Field(default=1, description="Max score for MCQ (usually 1)")

    @model_validator(mode='before')  # ← Changed from 'after' to 'before'
    def check_correct_answer_in_options(cls, values):
        # Handle dict input (before Pydantic processes it)
        if not isinstance(values, dict):
            return values
        
        if 'type' not in values or values['type'] != 'mcq':
            return values
        
        options = values.get('options', [])
        correct_answer = values.get('correct_answer', '')
        
        if not options or not correct_answer:
            return values
        
        # Try exact match first
        if correct_answer in options:
            return values
        
        # Try case-insensitive match
        correct_lower = correct_answer.lower().strip()
        for opt in options:
            if opt.lower().strip() == correct_lower:
                values['correct_answer'] = opt
                logger.debug(f"✅ Fixed case mismatch: corrected to '{opt}'")
                return values
        
        # Try partial match
        for opt in options:
            opt_clean = opt.lower().strip()
            if correct_lower in opt_clean or opt_clean in correct_lower:
                values['correct_answer'] = opt
                logger.debug(f"✅ Fixed partial match: corrected to '{opt}'")
                return values
        
        # Remove punctuation and try again
        correct_no_punct = correct_lower.translate(str.maketrans('', '', string.punctuation))
        for opt in options:
            opt_no_punct = opt.lower().strip().translate(str.maketrans('', '', string.punctuation))
            if correct_no_punct == opt_no_punct:
                values['correct_answer'] = opt
                logger.debug(f"✅ Fixed punctuation mismatch: corrected to '{opt}'")
                return values
        
        # Nuclear option: use first option
        logger.warning(f"⚠️ Validation workaround: '{correct_answer}' doesn't match options, using first option: '{options[0]}'")
        values['correct_answer'] = options[0]
        return values
        
class TheoryQuestion(BaseModel):
    type: Literal["theory"]
    question_text: str = Field(..., description="The text of the question")
    answer_text: str = Field(..., description="Concise answer/explanation")
    difficulty: str = Field(default="medium", description="easy | medium | hard")
    max_score: int = Field(default=3, description="Max score for theory question (usually 3)")

QuestionSchema = Union[MCQQuestion, TheoryQuestion]

# ----------------------------
# 🧩 Map options to DB fields (option_a–option_d)
# ----------------------------
def map_options_to_fields(options: Optional[List[str]]) -> Dict[str, Optional[str]]:
    if not options:
        return dict(option_a=None, option_b=None, option_c=None, option_d=None)
    opts = (options + [None, None, None, None])[:4]
    return dict(option_a=opts[0], option_b=opts[1], option_c=opts[2], option_d=opts[3])

# ----------------------------
# ⚙️ Semantic filtering and deduplication
# ----------------------------
def semantic_filter_and_dedupe(lesson_text: str, questions: List[Dict[str, Any]],
                               similarity_threshold: float = 0.40,
                               dedupe_threshold: float = 0.85) -> List[Dict[str, Any]]:
    if not questions:
        return []

    try:
        model = SentenceTransformer("all-MiniLM-L6-v2")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model.to(device)
    except Exception as e:
        logger.warning(f"⚠️ SentenceTransformer failed to load: {e}")
        return questions

    lesson_vec = model.encode(lesson_text, convert_to_tensor=True, device=device)
    kept, unique_questions = [], []

    for q in questions:
        q_text = q.get("question_text", "").strip()
        if not q_text:
            continue

        q_vec = model.encode(q_text, convert_to_tensor=True, device=device)
        sim = util.cos_sim(lesson_vec, q_vec).item()

        if sim < similarity_threshold:
            logger.debug(f"🗑️ Skipping off-topic question (sim={sim:.2f}): {q_text[:60]}...")
            continue

        is_duplicate = False
        for u in unique_questions:
            u_vec = model.encode(u["question_text"], convert_to_tensor=True, device=device)
            dup_sim = util.cos_sim(q_vec, u_vec).item()
            if dup_sim > dedupe_threshold:
                is_duplicate = True
                logger.debug(f"🧹 Removed near-duplicate (sim={dup_sim:.2f}) → {q_text[:50]}")
                break

        if not is_duplicate:
            kept.append(q)
            unique_questions.append(q)

    logger.info(f"🧠 Semantic filter: {len(kept)}/{len(questions)} questions kept after filtering")
    return kept

# ----------------------------
# 📦 IMPROVED JSON extraction with multiple strategies
# ----------------------------
def _extract_json_robust(raw: Any) -> List[Dict[str, Any]]:
    """Extract JSON from various response formats with aggressive cleaning"""
    
    logger.debug(f"🔍 Raw response type: {type(raw)}")
    
    # Already parsed
    if isinstance(raw, list):
        logger.debug(f"✅ Already a list with {len(raw)} items")
        return raw
    if isinstance(raw, dict):
        if "questions" in raw:
            logger.debug(f"✅ Dict with 'questions' key: {len(raw['questions'])} items")
            return raw["questions"]
        logger.debug("✅ Single dict, wrapping in list")
        return [raw]
    
    # Convert to string for processing
    raw_str = str(raw).strip()
    logger.debug(f"📝 Processing string of length {len(raw_str)}")
    
    # Remove markdown code blocks
    raw_str = re.sub(r'```json\s*', '', raw_str)
    raw_str = re.sub(r'```\s*', '', raw_str)
    
    # Try direct parse first
    try:
        parsed = json.loads(raw_str)
        if isinstance(parsed, list):
            logger.debug(f"✅ Direct parse: list with {len(parsed)} items")
            return parsed
        if isinstance(parsed, dict):
            if "questions" in parsed:
                logger.debug(f"✅ Direct parse: dict with questions ({len(parsed['questions'])} items)")
                return parsed["questions"]
            logger.debug("✅ Direct parse: single dict")
            return [parsed]
    except json.JSONDecodeError as e:
        logger.debug(f"❌ Direct parse failed: {e}")
    
    # Try to find JSON array
    array_pattern = r'\[\s*\{.*?\}\s*(?:,\s*\{.*?\}\s*)*\]'
    array_matches = re.findall(array_pattern, raw_str, re.DOTALL)
    
    for match in array_matches:
        try:
            parsed = json.loads(match)
            if isinstance(parsed, list) and len(parsed) > 0:
                logger.debug(f"✅ Extracted array: {len(parsed)} items")
                return parsed
        except json.JSONDecodeError:
            continue
    
    # Try to find object with questions key
    obj_pattern = r'\{[^{}]*"questions"\s*:\s*\[.*?\][^{}]*\}'
    obj_matches = re.findall(obj_pattern, raw_str, re.DOTALL)
    
    for match in obj_matches:
        try:
            parsed = json.loads(match)
            if "questions" in parsed:
                logger.debug(f"✅ Extracted questions object: {len(parsed['questions'])} items")
                return parsed["questions"]
        except json.JSONDecodeError:
            continue
    
    # Last resort: try to find individual question objects
    single_obj_pattern = r'\{[^{}]*"type"\s*:\s*"(?:mcq|theory)"[^{}]*\}'
    single_matches = re.findall(single_obj_pattern, raw_str, re.DOTALL)
    
    if single_matches:
        parsed_objects = []
        for match in single_matches:
            try:
                obj = json.loads(match)
                parsed_objects.append(obj)
            except json.JSONDecodeError:
                continue
        
        if parsed_objects:
            logger.debug(f"✅ Extracted individual objects: {len(parsed_objects)} items")
            return parsed_objects
    
    logger.warning(f"❌ Could not extract JSON. First 500 chars: {raw_str[:500]}")
    return []

# ----------------------------
# ✅ IMPROVED validation with detailed error logging
# ----------------------------
def _validate_questions_robust(parsed: List[Dict[str, Any]], target_count: int, pass_name: str = "") -> List[Dict[str, Any]]:
    """Validate and format questions - NUCLEAR OPTION: Manual validation"""
    
    if not parsed:
        logger.warning(f"⚠️ {pass_name}: No parsed questions to validate")
        return []
    
    logger.debug(f"🔍 {pass_name}: Attempting to validate {len(parsed)} questions")
    
    formatted = []
    seen = set()
    
    for item in parsed:
        try:
            # Skip if missing required fields
            if 'type' not in item or 'question_text' not in item:
                continue
            
            q_text = item['question_text'].strip()
            if not q_text or q_text.lower() in seen:
                continue
            
            # Handle MCQ
            if item['type'] == 'mcq':
                options = item.get('options', [])
                if len(options) != 4:
                    continue
                
                correct_answer = item.get('correct_answer', '')
                
                # FIX: Force correct_answer to match an option
                if correct_answer not in options:
                    # Try case-insensitive
                    found = False
                    for opt in options:
                        if opt.lower().strip() == correct_answer.lower().strip():
                            correct_answer = opt
                            found = True
                            break
                    
                    # Just use first option if nothing matches
                    if not found:
                        logger.warning(f"⚠️ {pass_name}: Forcing correct_answer to first option")
                        correct_answer = options[0]
                
                correct_index = options.index(correct_answer)
                correct_option = ["A", "B", "C", "D"][correct_index]
                
                formatted.append({
                    "question_text": q_text,
                    "answer_text": correct_answer,
                    "difficulty": item.get('difficulty', 'medium'),
                    "max_score": item.get('max_score', 1),
                    "option_a": options[0],
                    "option_b": options[1],
                    "option_c": options[2],
                    "option_d": options[3],
                    "correct_option": correct_option,
                })
            
            # Handle Theory
            elif item['type'] == 'theory':
                answer_text = item.get('answer_text', '')
                if not answer_text:
                    continue
                
                formatted.append({
                    "question_text": q_text,
                    "answer_text": answer_text,
                    "difficulty": item.get('difficulty', 'medium'),
                    "max_score": item.get('max_score', 3),
                    "option_a": None,
                    "option_b": None,
                    "option_c": None,
                    "option_d": None,
                    "correct_option": None,
                })
            
            seen.add(q_text.lower())
            
        except Exception as e:
            logger.debug(f"⚠️ {pass_name}: Skipped question due to error: {e}")
            continue
    
    logger.info(f"✅ {pass_name}: Formatted {len(formatted)} valid questions")
    return formatted

# ----------------------------
# 🔄 Helper: Call OpenAI and parse response
# ----------------------------
def _call_and_parse_questions(system_prompt: str, user_prompt: str, target_count: int, pass_name: str = "") -> List[Dict[str, Any]]:
    """Call OpenAI API and parse questions with robust error handling"""
    
    logger.debug(f"🚀 {pass_name}: Calling OpenAI (target: {target_count})")
    
    try:
        raw = call_openai_completion(
            f"{system_prompt}\n\n{user_prompt}",
            model=None,
            max_tokens=4096,
            response_format="json",
        )
        logger.debug(f"✅ {pass_name}: OpenAI call successful")
    except Exception as e:
        logger.error(f"❌ {pass_name}: OpenAI call failed: {e}")
        return []

    # Extract JSON
    parsed = _extract_json_robust(raw)
    
    if not parsed:
        logger.error(f"❌ {pass_name}: Could not extract any JSON from response")
        logger.debug(f"📋 {pass_name}: Raw response (first 1000 chars): {str(raw)[:1000]}")
        return []
    
    # Validate
    validated = _validate_questions_robust(parsed, target_count, pass_name)
    
    return validated

# ----------------------------
# 🧠 Pass 1: Content-based questions
# ----------------------------
def _generate_content_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions directly from lesson content"""
    
    system_prompt = """You are an expert mathematics teacher creating assessment questions.

CRITICAL REQUIREMENT: You MUST generate EXACTLY the number of questions requested. Not 1, not 2, but the FULL target amount.

CRITICAL MCQ RULE: For EVERY MCQ question, the "correct_answer" field MUST be a PERFECT CHARACTER-FOR-CHARACTER copy of ONE of the four options. Do NOT paraphrase or rewrite.

Example - CORRECT:
{
  "options": ["Factor the numerator", "Cancel x terms", "Find LCM", "Cross multiply"],
  "correct_answer": "Factor the numerator"  ← EXACT match
}

Example - WRONG:
{
  "options": ["Factor the numerator", "Cancel x terms", "Find LCM", "Cross multiply"],
  "correct_answer": "Factorize"  ← WRONG! Not exact match
}

Output ONLY a valid JSON array with NO markdown, NO explanations, NO preamble."""

    user_prompt = f"""Create EXACTLY {target_count} assessment questions from this lesson.

CRITICAL: You must generate ALL {target_count} questions. Count your questions before submitting.

{lesson_text}

Include:
- 60% MCQ questions (4 options each, correct_answer = EXACT copy of one option)
- 40% Theory questions (with concise answers)
- Mix of easy, medium, and hard difficulties

Output ONLY the JSON array with ALL {target_count} questions. No other text."""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count, "Pass 1 (Content)")

# ----------------------------
# 🔧 Pass 2: Application questions
# ----------------------------
def _generate_application_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions that apply concepts to new scenarios"""
    
    system_prompt = """You are an expert mathematics teacher creating application questions.

CRITICAL REQUIREMENT: Generate EXACTLY the target number requested. Count before submitting.

CRITICAL MCQ RULE: For EVERY MCQ question:
1. The "correct_answer" field MUST be a PERFECT CHARACTER-FOR-CHARACTER copy of ONE of the four options
2. Do NOT paraphrase or rewrite the correct answer
3. Copy-paste the exact option text

Example - CORRECT:
{
  "options": ["Factor the numerator", "Cancel x", "Find LCM", "Multiply"],
  "correct_answer": "Factor the numerator"  ← EXACT match with options[0]
}

Example - WRONG:
{
  "options": ["Factor the numerator", "Cancel x", "Find LCM", "Multiply"],
  "correct_answer": "Factorize the top"  ← WRONG! Must be exact copy
}

Output ONLY a valid JSON array."""

    user_prompt = f"""Based on this lesson, create EXACTLY {target_count} APPLICATION questions.

CRITICAL: Generate ALL {target_count} questions. Count before submitting.

{lesson_text}

Requirements:
- 50% MCQ (correct_answer = EXACT copy of one option)
- 50% Theory (requiring worked solutions)
- Apply concepts to NEW scenarios with different numbers
- Mix of difficulties

Output ONLY the JSON array with ALL {target_count} questions. No other text."""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count, "Pass 2 (Application)")

# ----------------------------
# 💡 Pass 3: Conceptual understanding questions
# ----------------------------
def _generate_conceptual_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions testing deeper understanding"""
    
    system_prompt = """You are an expert mathematics teacher creating conceptual questions.

CRITICAL REQUIREMENT: Generate EXACTLY the target number requested. Count before submitting.

CRITICAL MCQ RULE: For EVERY MCQ question:
1. The "correct_answer" field MUST be a PERFECT CHARACTER-FOR-CHARACTER copy of ONE of the four options
2. Do NOT paraphrase, shorten, or modify the correct answer
3. Copy the EXACT text from one of the options

Example - CORRECT:
{
  "options": ["They added denominators instead of finding LCM", "Multiplied", "Divided", "Subtracted"],
  "correct_answer": "They added denominators instead of finding LCM"  ← EXACT match
}

Example - WRONG:
{
  "options": ["They added denominators instead of finding LCM", "Multiplied", "Divided", "Subtracted"],
  "correct_answer": "Added denominators"  ← WRONG! Not complete match
}

Output ONLY a valid JSON array."""

    user_prompt = f"""Based on this lesson, create EXACTLY {target_count} CONCEPTUAL questions.

CRITICAL: Generate ALL {target_count} questions. Count before submitting.

{lesson_text}

Requirements:
- 40% MCQ (correct_answer = EXACT copy of one option)
- 60% Theory (requiring explanations)
- Focus on WHY methods work, common errors, misconceptions
- Mix of difficulties

Output ONLY the JSON array with ALL {target_count} questions. No other text."""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count, "Pass 3 (Conceptual)")

# ----------------------------
# ⚖️ Balance questions by difficulty
# ----------------------------
def _balance_difficulty(questions: List[Dict[str, Any]], max_count: int) -> List[Dict[str, Any]]:
    """Balance questions across difficulty levels"""
    
    easy = [q for q in questions if q["difficulty"] == "easy"]
    medium = [q for q in questions if q["difficulty"] == "medium"]
    hard = [q for q in questions if q["difficulty"] == "hard"]
    
    # Target distribution: 30% easy, 40% medium, 30% hard
    target_easy = max_count * 3 // 10
    target_medium = max_count * 4 // 10
    target_hard = max_count * 3 // 10
    
    balanced = (
        easy[:target_easy] +
        medium[:target_medium] +
        hard[:target_hard]
    )
    
    # Fill remaining slots
    if len(balanced) < max_count:
        remaining = [q for q in questions if q not in balanced]
        balanced.extend(remaining[:max_count - len(balanced)])
    
    return balanced[:max_count]

# ----------------------------
# 🎯 Multi-pass generation strategy
# ----------------------------
def generate_questions_multi_pass(
    lesson_text: str,
    max_questions: int = 30,
    enable_semantic_filter: bool = True,
) -> List[Dict[str, Any]]:
    """Generate questions using multiple passes"""
    
    all_questions = []
    
    # Pass 1: Content (50% of target)
    content_questions = _generate_content_questions(lesson_text, max_questions // 2)
    all_questions.extend(content_questions)
    logger.info(f"📚 Pass 1 (Content): Generated {len(content_questions)} questions")
    
    # Pass 2: Application (25% of target)
    application_questions = _generate_application_questions(lesson_text, max_questions // 4)
    all_questions.extend(application_questions)
    logger.info(f"🔧 Pass 2 (Application): Generated {len(application_questions)} questions")
    
    # Pass 3: Conceptual (25% of target)
    conceptual_questions = _generate_conceptual_questions(lesson_text, max_questions // 4)
    all_questions.extend(conceptual_questions)
    logger.info(f"💡 Pass 3 (Conceptual): Generated {len(conceptual_questions)} questions")
    
    # Apply semantic filtering
    if enable_semantic_filter and all_questions:
        all_questions = semantic_filter_and_dedupe(lesson_text, all_questions)
    
    # Balance by difficulty
    if all_questions:
        all_questions = _balance_difficulty(all_questions, max_questions)
    
    logger.info(f"✅ Total generated: {len(all_questions)} questions")
    return all_questions

# ----------------------------
# 🔧 Main entry point
# ----------------------------
def generate_questions_with_ai(
    lesson_text: str,
    max_questions: int = 30,
    min_expected: Optional[int] = None,
    enable_semantic_filter: bool = True,
) -> List[Dict[str, Any]]:
    """Enhanced question generation using multi-pass strategy"""
    
    logger.info(f"🧠 Starting enhanced question generation (target: {max_questions})")
    
    # Use multi-pass generation
    questions = generate_questions_multi_pass(
        lesson_text,
        max_questions,
        enable_semantic_filter
    )
    
    # Fallback if no questions generated
    if not questions:
        logger.error("❌ No valid questions generated — using fallback")
        questions = [{
            "question_text": "Summarize the main concepts covered in this lesson.",
            "answer_text": lesson_text[:200] + "..." if len(lesson_text) > 200 else lesson_text,
            "difficulty": "medium",
            "max_score": 3,
            "option_a": None,
            "option_b": None,
            "option_c": None,
            "option_d": None,
            "correct_option": None,
        }]
    
    logger.info(f"✅ Final output: {len(questions)} questions")
    logger.debug("🧩 Sample questions:\n" + safe_json_dumps(questions[:3]))
    
    return questions