from typing import List, Dict, Any, Optional, Union, Literal
import json
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
    options: List[str] = Field(..., min_items=4, max_items=4, description="List of 4 MCQ options")
    correct_answer: str = Field(..., description="The correct answer (must be one of options)")
    difficulty: str = Field(default="medium", description="easy | medium | hard")
    max_score: int = Field(default=1, description="Max score for MCQ (usually 1)")

    @model_validator(mode='after')
    def check_correct_answer_in_options(cls, model):
        if model.correct_answer not in model.options:
            raise ValueError("correct_answer must be exactly one of the options")
        return model

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
# 🎯 NEW: Multi-pass generation strategy
# ----------------------------
def generate_questions_multi_pass(
    lesson_text: str,
    max_questions: int = 30,
    enable_semantic_filter: bool = True,
) -> List[Dict[str, Any]]:
    """
    Generate questions using multiple passes with different focuses:
    1. Content-based questions (from the lesson)
    2. Application questions (real-world scenarios)
    3. Conceptual questions (understanding & connections)
    """
    
    all_questions = []
    
    # Pass 1: Content-based questions (40% of target)
    content_questions = _generate_content_questions(lesson_text, max_questions // 2)
    all_questions.extend(content_questions)
    logger.info(f"📚 Pass 1 (Content): Generated {len(content_questions)} questions")
    
    # Pass 2: Application questions (30% of target)
    application_questions = _generate_application_questions(lesson_text, max_questions // 4)
    all_questions.extend(application_questions)
    logger.info(f"🔧 Pass 2 (Application): Generated {len(application_questions)} questions")
    
    # Pass 3: Conceptual questions (30% of target)
    conceptual_questions = _generate_conceptual_questions(lesson_text, max_questions // 4)
    all_questions.extend(conceptual_questions)
    logger.info(f"💡 Pass 3 (Conceptual): Generated {len(conceptual_questions)} questions")
    
    # Apply semantic filtering and deduplication
    if enable_semantic_filter:
        all_questions = semantic_filter_and_dedupe(lesson_text, all_questions)
    
    # Balance by difficulty
    all_questions = _balance_difficulty(all_questions, max_questions)
    
    logger.info(f"✅ Total generated: {len(all_questions)} questions")
    return all_questions

# ----------------------------
# 🧠 Pass 1: Content-based questions
# ----------------------------
def _generate_content_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions directly from lesson content"""
    
    system_prompt = """You are an expert mathematics teacher creating assessment questions.
Generate questions that test knowledge and understanding of the lesson content.

FOCUS ON:
- Definitions and terminology
- Key concepts and procedures
- Step-by-step processes
- Direct application of formulas

Generate a mix of easy, medium, and hard questions.
Output ONLY valid JSON array with no markdown or extra text."""

    user_prompt = f"""Create {target_count} assessment questions from this lesson:

{lesson_text}

Include:
- 60% MCQ questions (test recognition and understanding)
- 40% Theory questions (test explanation ability)

Each MCQ must have 4 options with exactly one correct answer.
Theory questions should ask students to explain, describe, or show steps."""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count)

# ----------------------------
# 🔧 Pass 2: Application questions
# ----------------------------
def _generate_application_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions that apply concepts to new scenarios"""
    
    system_prompt = """You are an expert mathematics teacher creating challenging application questions.
Create questions that require students to APPLY concepts to NEW situations not in the lesson.

FOCUS ON:
- Real-world problem scenarios
- Multi-step word problems
- Questions requiring multiple concepts
- Variations on lesson examples with different numbers/contexts

Output ONLY valid JSON array with no markdown or extra text."""

    user_prompt = f"""Based on this lesson, create {target_count} APPLICATION questions:

{lesson_text}

Generate questions that:
1. Use different numbers and scenarios than the examples
2. Combine multiple concepts from the lesson
3. Present real-world contexts (money, measurements, practical scenarios)
4. Require students to choose the correct approach/formula

Mix of:
- 50% MCQ (with plausible distractors showing common mistakes)
- 50% Theory (requiring worked solutions)"""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count)

# ----------------------------
# 💡 Pass 3: Conceptual understanding questions
# ----------------------------
def _generate_conceptual_questions(lesson_text: str, target_count: int) -> List[Dict[str, Any]]:
    """Generate questions testing deeper understanding"""
    
    system_prompt = """You are an expert mathematics teacher creating conceptual questions.
Create questions that test WHY and HOW, not just WHAT.

FOCUS ON:
- Why certain methods work
- Connections between concepts
- Common misconceptions
- Comparing different approaches
- Identifying errors in given work

Output ONLY valid JSON array with no markdown or extra text."""

    user_prompt = f"""Based on this lesson, create {target_count} CONCEPTUAL questions:

{lesson_text}

Generate questions that:
1. Ask "Why does this method work?"
2. Compare two approaches
3. Identify mistakes in sample work
4. Ask students to explain their reasoning
5. Test understanding of underlying principles

Mix of:
- 40% MCQ (testing conceptual understanding)
- 60% Theory (requiring explanations and justifications)"""

    return _call_and_parse_questions(system_prompt, user_prompt, target_count)

# ----------------------------
# 🔄 Helper: Call OpenAI and parse response
# ----------------------------
def _call_and_parse_questions(system_prompt: str, user_prompt: str, target_count: int) -> List[Dict[str, Any]]:
    """Call OpenAI API and parse questions"""
    
    try:
        raw = call_openai_completion(
            f"{system_prompt}\n\n{user_prompt}",
            model=None,
            max_tokens=4000,
            response_format="json",
        )
    except Exception as e:
        logger.error(f"❌ OpenAI call failed: {e}")
        return []

    # Parse JSON with fallback strategies
    parsed = _extract_json(raw)
    
    # Validate with Pydantic
    validated = _validate_questions(parsed, target_count)
    
    return validated

# ----------------------------
# 📦 JSON extraction with multiple strategies
# ----------------------------
def _extract_json(raw: Any) -> List[Dict[str, Any]]:
    """Extract JSON from various response formats"""
    
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        return raw.get("questions", [raw])
    
    # Try direct parse
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed.get("questions", [parsed])
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        pass
    
    # Extract from markdown or mixed text
    import re
    
    # Try array pattern
    array_match = re.search(r'\[\s*\{.*\}\s*\]', str(raw), re.DOTALL)
    if array_match:
        try:
            return json.loads(array_match.group())
        except json.JSONDecodeError:
            pass
    
    # Try object with questions key
    obj_match = re.search(r'\{.*"questions"\s*:\s*\[.*\].*\}', str(raw), re.DOTALL)
    if obj_match:
        try:
            parsed = json.loads(obj_match.group())
            return parsed.get("questions", [])
        except json.JSONDecodeError:
            pass
    
    return []

# ----------------------------
# ✅ Validate questions with Pydantic
# ----------------------------
def _validate_questions(parsed: List[Dict[str, Any]], target_count: int) -> List[Dict[str, Any]]:
    """Validate and format questions"""
    
    validated_questions = []
    
    try:
        validated_questions = parse_obj_as(List[QuestionSchema], parsed[:target_count * 2])
    except ValidationError as ve:
        logger.warning(f"⚠️ Validation errors: {len(ve.errors())} errors")
        # Try validating one by one
        for item in parsed:
            try:
                validated_questions.append(parse_obj_as(QuestionSchema, item))
            except ValidationError:
                continue
    
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
    
    return formatted

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
# 🔧 Main entry point (updated)
# ----------------------------
def generate_questions_with_ai(
    lesson_text: str,
    max_questions: int = 50,
    min_expected: Optional[int] = None,
    enable_semantic_filter: bool = True,
) -> List[Dict[str, Any]]:
    """
    Enhanced question generation using multi-pass strategy
    """
    
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