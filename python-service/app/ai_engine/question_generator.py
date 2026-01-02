from typing import List, Dict, Any, Optional, Union, Literal
import json
import re
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

    @model_validator(mode='after')
    def check_correct_answer_in_options(self):
        # Try exact match first
        if self.correct_answer in self.options:
            return self
        
        # Try case-insensitive match
        correct_lower = self.correct_answer.lower().strip()
        for i, opt in enumerate(self.options):
            if opt.lower().strip() == correct_lower:
                self.correct_answer = self.options[i]  # Use exact option text
                logger.debug(f"✅ Fixed case mismatch: '{self.correct_answer}' → '{self.options[i]}'")
                return self
        
        # Try partial match (correct_answer is substring of option or vice versa)
        for i, opt in enumerate(self.options):
            if correct_lower in opt.lower() or opt.lower() in correct_lower:
                self.correct_answer = self.options[i]
                logger.debug(f"✅ Fixed partial match: '{self.correct_answer}' → '{self.options[i]}'")
                return self
        
        # No match found
        raise ValueError(f"correct_answer '{self.correct_answer}' must match one of the options: {self.options}")
        return self

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
    """Validate and format questions with detailed error logging"""
    
    if not parsed:
        logger.warning(f"⚠️ {pass_name}: No parsed questions to validate")
        return []
    
    logger.debug(f"🔍 {pass_name}: Attempting to validate {len(parsed)} questions")
    logger.debug(f"📋 {pass_name}: Sample raw question: {json.dumps(parsed[0], indent=2)}")
    
    validated_questions = []
    validation_errors = []
    
    # Try bulk validation first
    try:
        validated_questions = parse_obj_as(List[QuestionSchema], parsed[:target_count * 2])
        logger.info(f"✅ {pass_name}: Bulk validation successful - {len(validated_questions)} questions")
    except ValidationError as ve:
        logger.warning(f"⚠️ {pass_name}: Bulk validation failed with {len(ve.errors())} errors")
        
        # Log first few detailed errors
        for i, err in enumerate(ve.errors()[:3]):
            logger.debug(f"📋 {pass_name}: Error {i+1}: {err['msg']} at {err.get('loc', 'unknown')}")
        
        # Try one by one with detailed logging
        for i, item in enumerate(parsed):
            try:
                validated = parse_obj_as(QuestionSchema, item)
                validated_questions.append(validated)
            except ValidationError as e:
                # Log detailed error for first few failures
                if len(validation_errors) < 3:
                    logger.debug(f"❌ {pass_name}: Question {i+1} failed: {json.dumps(item, indent=2)[:200]}")
                    for err in e.errors()[:2]:
                        logger.debug(f"   → {err['msg']} at {err.get('loc', 'unknown')}")
                
                validation_errors.append({
                    "index": i,
                    "question": item.get("question_text", "N/A")[:50],
                    "errors": [err["msg"] for err in e.errors()[:3]]
                })
                continue
        
        if validation_errors:
            logger.warning(f"⚠️ {pass_name}: Failed to validate {len(validation_errors)} questions")
            logger.debug(f"📋 {pass_name}: Sample failures: {validation_errors[:3]}")
    
    # Format for database
    seen = set()
    formatted = []
    
    for q in validated_questions:
        q_text = q.question_text.strip()
        if not q_text or q_text.lower() in seen:
            continue
        
        options = None
        correct_option = None
        answer_text = None
        
        if q.type == "mcq":
            options = q.options
            answer_text = q.correct_answer
            try:
                correct_index = options.index(q.correct_answer)
                correct_option = ["A", "B", "C", "D"][correct_index]
            except (ValueError, IndexError):
                logger.debug(f"⚠️ {pass_name}: Skipping MCQ - correct_answer not in options")
                continue
        else:
            answer_text = q.answer_text
        
        opts_dict = map_options_to_fields(options)
        
        formatted.append({
            "question_text": q.question_text,
            "answer_text": answer_text,
            "difficulty": q.difficulty,
            "max_score": q.max_score,
            "option_a": opts_dict["option_a"],
            "option_b": opts_dict["option_b"],
            "option_c": opts_dict["option_c"],
            "option_d": opts_dict["option_d"],
            "correct_option": correct_option,
        })
        seen.add(q_text.lower())
    
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
            max_tokens=4000,
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
Generate questions that test knowledge and understanding of the lesson content.

CRITICAL: Output ONLY a valid JSON array with NO markdown, NO explanations, NO preamble.

Example format:
[
  {
    "type": "mcq",
    "question_text": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correct_answer": "4",
    "difficulty": "easy",
    "max_score": 1
  }
]

FOCUS ON:
- Definitions and terminology
- Key concepts and procedures
- Direct application of formulas

Generate a mix of easy, medium, and hard questions."""

    user_prompt = f"""Create {target_count} assessment questions from this lesson:

{lesson_text}

Include:
- 60% MCQ questions (4 options each, one correct answer)
- 40% Theory questions (with concise answers)

Output ONLY the JSON array. No other text."""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count, "Pass 1 (Content)")

# ----------------------------
# 🔧 Pass 2: Application questions
# ----------------------------
def _generate_application_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions that apply concepts to new scenarios"""
    
    system_prompt = """You are an expert mathematics teacher creating application questions.

CRITICAL: Output ONLY a valid JSON array with NO markdown, NO explanations, NO preamble.

CRITICAL MCQ RULE: The "correct_answer" field MUST be EXACTLY one of the four options, character-for-character identical. Copy-paste the exact option text.

Example:
{
  "type": "mcq",
  "question_text": "What is 2 + 2?",
  "options": ["Three", "Four", "Five", "Six"],
  "correct_answer": "Four",  <-- EXACTLY matches options[1]
  "difficulty": "easy",
  "max_score": 1
}

FOCUS ON:
- Real-world problem scenarios
- Multi-step word problems
- Different numbers/contexts than examples

Output ONLY the JSON array."""

    user_prompt = f"""Based on this lesson, create {target_count} APPLICATION questions:

{lesson_text}

Mix of:
- 50% MCQ (ensure correct_answer EXACTLY matches one option)
- 50% Theory (requiring worked solutions)

Output ONLY the JSON array. No other text."""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count, "Pass 2 (Application)")

# ----------------------------
# 💡 Pass 3: Conceptual understanding questions
# ----------------------------
def _generate_conceptual_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions testing deeper understanding"""
    
    system_prompt = """You are an expert mathematics teacher creating conceptual questions.

CRITICAL: Output ONLY a valid JSON array with NO markdown, NO explanations, NO preamble.

CRITICAL MCQ RULE: The "correct_answer" field MUST be EXACTLY one of the four options, character-for-character identical.

FOCUS ON:
- Why methods work
- Common misconceptions
- Comparing approaches

Output ONLY the JSON array."""

    user_prompt = f"""Based on this lesson, create {target_count} CONCEPTUAL questions:

{lesson_text}

Mix of:
- 40% MCQ (ensure correct_answer EXACTLY matches one option)
- 60% Theory (requiring explanations)

Output ONLY the JSON array. No other text."""

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