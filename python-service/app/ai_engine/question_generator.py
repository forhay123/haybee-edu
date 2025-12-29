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
                               similarity_threshold: float = 0.45,  # ✅ More lenient (was 0.55)
                               dedupe_threshold: float = 0.85) -> List[Dict[str, Any]]:  # ✅ Stricter (was 0.80)
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
# 🧠 Core generator logic (improved version)
# ----------------------------
def generate_questions_with_ai(
    lesson_text: str,
    max_questions: int = 50,  # ✅ Increased from 35 to 50
    min_expected: Optional[int] = None,
    enable_semantic_filter: bool = True,
) -> List[Dict[str, Any]]:
    min_expected = min_expected or max(15, max_questions // 2)  # ✅ Higher minimum
    logger.info(f"🧠 Generating up to {max_questions} questions (min expected: {min_expected})")

    base_prompt = load_prompt_template("question_generation.txt")

    system_instruction = (
        "You are an educational AI assistant tasked with generating a diverse set of assessment "
        "questions for a given lesson. Output only valid JSON (no markdown, no commentary).\n\n"
        "OUTPUT RULES:\n"
        "- Return a JSON array of question objects.\n"
        "- Each object must contain all required fields.\n"
        "- MCQ questions must have 'type': 'mcq', 'question_text', 'options' (list of 4), 'correct_answer', 'difficulty', 'max_score'.\n"
        "- Theory questions must have 'type': 'theory', 'question_text', 'answer_text', 'difficulty', 'max_score'.\n"
        "- Provide a balanced mix of easy, medium, and hard questions.\n"
        "- Use short and clear questions suitable for adaptive learning progression.\n"
        f"- IMPORTANT: Generate AT LEAST {min_expected} questions, aiming for {max_questions} total.\n\n"
        "Example JSON structure:\n"
        "[{\n"
        "  'type': 'mcq',\n"
        "  'question_text': 'What is photosynthesis?',\n"
        "  'options': ['Conversion of sunlight to energy', 'Respiration', 'Evaporation', 'None'],\n"
        "  'correct_answer': 'Conversion of sunlight to energy',\n"
        "  'difficulty': 'easy',\n"
        "  'max_score': 1\n"
        "}, {\n"
        "  'type': 'theory',\n"
        "  'question_text': 'Explain the process of photosynthesis.',\n"
        "  'answer_text': 'Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose.',\n"
        "  'difficulty': 'medium',\n"
        "  'max_score': 3\n"
        "}]"
    )

    prompt = f"{system_instruction}\n\nLesson Text:\n{lesson_text}\n\n{base_prompt}"

    def _call_and_parse() -> List[Dict[str, Any]]:
        try:
            raw = call_openai_completion(
                prompt,
                model=None,
                max_tokens=4000,  # ✅ Increased from 1800
                response_format="json",
            )
        except Exception as e:
            logger.error(f"❌ OpenAI call failed: {e}")
            return []

        # ✅ Improved JSON parsing with multiple strategies
        parsed = []
        
        # Strategy 1: Direct parse if already dict/list
        if isinstance(raw, (list, dict)):
            parsed = raw
        else:
            # Strategy 2: Try direct JSON parse
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                # Strategy 3: Extract JSON from markdown or text
                import re
                
                # Try to find JSON array
                array_match = re.search(r'\[\s*\{.*\}\s*\]', raw, re.DOTALL)
                if array_match:
                    try:
                        parsed = json.loads(array_match.group())
                    except json.JSONDecodeError:
                        pass
                
                # Try to find JSON object containing questions
                if not parsed:
                    obj_match = re.search(r'\{.*"questions"\s*:\s*\[.*\].*\}', raw, re.DOTALL)
                    if obj_match:
                        try:
                            parsed = json.loads(obj_match.group())
                        except json.JSONDecodeError:
                            pass

        # Normalize to list
        if isinstance(parsed, dict):
            parsed = parsed.get("questions", [parsed])
        elif not isinstance(parsed, list):
            parsed = [parsed] if parsed else []
            
        return parsed

    # ✅ Retry mechanism if insufficient questions
    parsed = _call_and_parse()
    if len(parsed) < min_expected:
        logger.warning(f"⚙️ Only {len(parsed)} questions parsed — retrying once for more questions.")
        retry_parsed = _call_and_parse()
        if len(retry_parsed) > len(parsed):
            parsed = retry_parsed

    # Validate questions using Pydantic
    validated_questions = []
    validation_errors = []
    try:
        validated_questions = parse_obj_as(List[QuestionSchema], parsed[: max_questions * 2])
    except ValidationError as ve:
        validation_errors = ve.errors()

    if validation_errors:
        logger.warning(f"⚠️ Validation errors in batch parse: {len(validation_errors)} errors")

    # Process validated questions
    seen = set()
    validated = []

    for q in validated_questions:
        q_text = q.question_text.strip()
        if not q_text or q_text.lower() in seen:
            continue

        options = None
        correct_option = None
        answer_text = None

        if hasattr(q, "type") and q.type == "mcq":
            options = q.options
            answer_text = q.correct_answer
            try:
                correct_index = options.index(q.correct_answer)
                correct_option = ["A", "B", "C", "D"][correct_index]
            except (ValueError, IndexError):
                pass
        else:
            answer_text = getattr(q, "answer_text", None)

        opts_dict = map_options_to_fields(options)

        validated.append({
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

    if enable_semantic_filter:
        validated = semantic_filter_and_dedupe(lesson_text, validated)

    # Balance by difficulty
    easy = [q for q in validated if q["difficulty"] == "easy"]
    medium = [q for q in validated if q["difficulty"] == "medium"]
    hard = [q for q in validated if q["difficulty"] == "hard"]

    adaptive = easy[: max_questions // 3] + medium[: max_questions // 3] + hard[: max_questions // 3]
    if len(adaptive) < max_questions:
        adaptive += validated[len(adaptive) : max_questions]

    if not adaptive:
        logger.error("❌ No valid questions generated — using fallback question.")
        adaptive = [
            {
                "question_text": "Summarize the main idea of this lesson.",
                "answer_text": lesson_text[:200] + "..." if len(lesson_text) > 200 else lesson_text,
                "difficulty": "medium",
                "max_score": 1,
                "option_a": None,
                "option_b": None,
                "option_c": None,
                "option_d": None,
                "correct_option": None,
            }
        ]

    logger.info(f"✅ Generated {len(adaptive)} adaptive, filtered questions.")
    logger.debug("🧩 Final questions:\n" + safe_json_dumps(adaptive))
    return adaptive