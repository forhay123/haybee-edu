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
# 🔒 ENHANCED Pydantic schemas with workings field
# ----------------------------

class MCQQuestion(BaseModel):
    type: Literal["mcq"]
    question_text: str = Field(..., description="The text of the question")
    options: List[str] = Field(..., min_length=4, max_length=4, description="List of 4 MCQ options")
    correct_answer: str = Field(..., description="The correct answer (must be one of options)")
    difficulty: str = Field(default="medium", description="easy | medium | hard")
    max_score: int = Field(default=1, description="Max score for MCQ (usually 1)")
    
    # ✅ NEW: Step-by-step workings field
    workings: Optional[str] = Field(
        default=None, 
        description="Detailed step-by-step solution showing how to arrive at the answer"
    )

    @model_validator(mode='after')
    def check_correct_answer_in_options(self):
        # Try exact match first
        if self.correct_answer in self.options:
            return self
        
        # Try case-insensitive match
        correct_lower = self.correct_answer.lower().strip()
        for i, opt in enumerate(self.options):
            if opt.lower().strip() == correct_lower:
                self.correct_answer = self.options[i]
                return self
        
        # Try partial match
        for i, opt in enumerate(self.options):
            opt_clean = opt.lower().strip()
            if correct_lower in opt_clean or opt_clean in correct_lower:
                self.correct_answer = self.options[i]
                return self
        
        # Remove punctuation and try again
        correct_no_punct = correct_lower.translate(str.maketrans('', '', string.punctuation))
        for i, opt in enumerate(self.options):
            opt_no_punct = opt.lower().strip().translate(str.maketrans('', '', string.punctuation))
            if correct_no_punct == opt_no_punct:
                self.correct_answer = self.options[i]
                return self
        
        # Nuclear option: pick first option
        logger.warning(f"⚠️ Auto-fix: '{self.correct_answer}' → '{self.options[0]}'")
        self.correct_answer = self.options[0]
        return self
        
class TheoryQuestion(BaseModel):
    type: Literal["theory"]
    question_text: str = Field(..., description="The text of the question")
    answer_text: str = Field(..., description="Concise answer/explanation")
    difficulty: str = Field(default="medium", description="easy | medium | hard")
    max_score: int = Field(default=3, description="Max score for theory question (usually 3)")
    
    # ✅ NEW: Step-by-step workings field (for calculation-based theory questions)
    workings: Optional[str] = Field(
        default=None, 
        description="Detailed step-by-step solution if the question involves calculations"
    )

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
            continue

        is_duplicate = False
        for u in unique_questions:
            u_vec = model.encode(u["question_text"], convert_to_tensor=True, device=device)
            dup_sim = util.cos_sim(q_vec, u_vec).item()
            if dup_sim > dedupe_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            kept.append(q)
            unique_questions.append(q)

    logger.info(f"🧠 Semantic filter: {len(kept)}/{len(questions)} kept")
    return kept

# ----------------------------
# 📦 JSON extraction
# ----------------------------
def _extract_json_robust(raw: Any) -> List[Dict[str, Any]]:
    """Extract JSON from various response formats"""
    
    # Already parsed
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        if "questions" in raw:
            return raw["questions"]
        return [raw]
    
    # Convert to string
    raw_str = str(raw).strip()
    
    # Remove markdown
    raw_str = re.sub(r'```json\s*', '', raw_str)
    raw_str = re.sub(r'```\s*', '', raw_str)
    
    # Try direct parse
    try:
        parsed = json.loads(raw_str)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            if "questions" in parsed:
                return parsed["questions"]
            return [parsed]
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON array
    array_pattern = r'\[\s*\{.*?\}\s*(?:,\s*\{.*?\}\s*)*\]'
    array_matches = re.findall(array_pattern, raw_str, re.DOTALL)
    
    for match in array_matches:
        try:
            parsed = json.loads(match)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
        except json.JSONDecodeError:
            continue
    
    logger.warning(f"❌ Could not extract JSON")
    return []

# ----------------------------
# ✅ ENHANCED Validation with workings
# ----------------------------
def _validate_questions_robust(parsed: List[Dict[str, Any]], target_count: int, pass_name: str = "") -> List[Dict[str, Any]]:
    """Validate and format questions including workings field"""
    
    if not parsed:
        return []
    
    validated_questions = []
    
    # Try bulk validation
    try:
        validated_questions = parse_obj_as(List[QuestionSchema], parsed)
        logger.info(f"✅ {pass_name}: Validated {len(validated_questions)} questions")
    except ValidationError:
        # Try one by one
        for item in parsed:
            try:
                validated = parse_obj_as(QuestionSchema, item)
                validated_questions.append(validated)
            except ValidationError:
                continue
        
        logger.info(f"✅ {pass_name}: Validated {len(validated_questions)}/{len(parsed)} questions")
    
    # Format for database
    seen = set()
    formatted = []
    
    for q in validated_questions:
        q_text = q.question_text.strip()
        if not q_text or q_text.lower() in seen:
            continue
        
        # Truncate question text
        if len(q_text) > 250:
            q_text = q_text[:247] + "..."
            logger.warning(f"⚠️ Truncated long question: {q_text}")
        
        # Truncate answer text
        answer = q.correct_answer if q.type == "mcq" else q.answer_text
        if len(answer) > 250:
            answer = answer[:247] + "..."
            logger.warning(f"⚠️ Truncated long answer: {answer[:50]}...")
        
        # ✅ NEW: Extract workings field
        workings = getattr(q, 'workings', None)
        
        if q.type == "mcq":
            correct_index = q.options.index(q.correct_answer)
            correct_option = ["A", "B", "C", "D"][correct_index]
            opts_dict = map_options_to_fields(q.options)
            
            formatted.append({
                "question_text": q_text,
                "answer_text": answer,
                "difficulty": q.difficulty,
                "max_score": q.max_score,
                "option_a": opts_dict["option_a"],
                "option_b": opts_dict["option_b"],
                "option_c": opts_dict["option_c"],
                "option_d": opts_dict["option_d"],
                "correct_option": correct_option,
                "workings": workings  # ✅ ADD WORKINGS
            })
        else:
            formatted.append({
                "question_text": q_text,
                "answer_text": answer,
                "difficulty": q.difficulty,
                "max_score": q.max_score,
                "option_a": None,
                "option_b": None,
                "option_c": None,
                "option_d": None,
                "correct_option": None,
                "workings": workings  # ✅ ADD WORKINGS
            })
            
        seen.add(q_text.lower())
    
    return formatted

# ---------------------------
# 🎯 ENHANCED GENERATION WITH WORKINGS
# ----------------------------
def generate_questions_with_ai(
    lesson_text: str,
    max_questions: int = 30,
    min_expected: Optional[int] = None,
    enable_semantic_filter: bool = True,
) -> List[Dict[str, Any]]:
    """Generate questions with step-by-step workings for calculations"""
    
    logger.info(f"🧠 Starting question generation with workings (target: {max_questions})")
    
    # ✅ ENHANCED prompt with workings instructions
    system_prompt = """You are an expert mathematics teacher creating assessment questions with detailed solutions.

Generate a JSON array with this EXACT structure:

[
  {
    "type": "mcq",
    "question_text": "Your question here?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct_answer": "Option 1",
    "difficulty": "easy",
    "max_score": 1,
    "workings": "Step 1: Explanation\\nStep 2: Calculation\\nStep 3: Final answer"
  },
  {
    "type": "theory",
    "question_text": "Your question here?",
    "answer_text": "Your answer here.",
    "difficulty": "medium",
    "max_score": 3,
    "workings": "Step-by-step solution if applicable, null otherwise"
  }
]

CRITICAL RULES FOR WORKINGS:
1. Include "workings" field for ALL calculation-based questions
2. Format: Clear numbered steps (Step 1, Step 2, etc.)
3. Show ALL intermediate calculations
4. Include formulas used
5. Explain key reasoning at each step
6. For conceptual/definition questions, set workings to null
7. Use \\n for line breaks in workings

EXAMPLE WORKINGS FOR: "Simplify (6x/5) ÷ (3x/2)"

"workings": "Step 1: Convert division to multiplication by reciprocal\\n(6x/5) ÷ (3x/2) = (6x/5) × (2/3x)\\n\\nStep 2: Multiply numerators and denominators\\n= (6x × 2) / (5 × 3x)\\n= 12x / 15x\\n\\nStep 3: Cancel common factors\\nCancel x: 12x/15x = 12/15\\nDivide by 3: 12/15 = 4/5\\n\\nFinal Answer: 4/5"

OTHER RULES:
1. Field names: "question_text" (NOT "question"), "answer_text" (NOT "answer")
2. For MCQ: "correct_answer" must EXACTLY match one of the options
3. Always include "type", "difficulty", "max_score", "workings"
4. Mix 60% MCQ / 40% Theory
5. Mix difficulties: 30% easy, 40% medium, 30% hard

Output ONLY the JSON array. No markdown, no explanations."""

    user_prompt = f"""Generate {max_questions} assessment questions from this lesson:

{lesson_text}

Create ALL {max_questions} questions now with workings for calculation questions. Include:
- Direct recall questions (with workings if calculations involved)
- Application questions with NEW scenarios (with workings)
- Conceptual questions (workings = null)

Output the JSON array with {max_questions} questions:"""

    try:
        # Make the API call
        raw = call_openai_completion(
            f"{system_prompt}\n\n{user_prompt}",
            model=None,
            max_tokens=4096,
        )
        
        logger.debug(f"✅ OpenAI call successful")
        
        # Extract and validate
        parsed = _extract_json_robust(raw)
        
        if not parsed:
            logger.error("❌ No questions extracted")
            return _create_fallback_question(lesson_text)
        
        logger.info(f"📦 Extracted {len(parsed)} raw questions")
        
        # Count questions with workings
        with_workings = sum(1 for q in parsed if q.get("workings"))
        logger.info(f"📝 {with_workings}/{len(parsed)} questions have workings")
        
        validated = _validate_questions_robust(parsed, max_questions, "Generation")
        
        if not validated:
            logger.error("❌ No questions passed validation")
            return _create_fallback_question(lesson_text)
        
        logger.info(f"✅ Validated {len(validated)} questions with workings")
        
        # Apply semantic filtering if enabled
        if enable_semantic_filter and len(validated) > max_questions:
            validated = semantic_filter_and_dedupe(lesson_text, validated)
            logger.info(f"🧹 After deduplication: {len(validated)} questions")
        
        # Truncate to max if needed
        if len(validated) > max_questions:
            validated = validated[:max_questions]
        
        final_with_workings = sum(1 for q in validated if q.get("workings"))
        logger.info(f"✅ Final output: {len(validated)} questions ({final_with_workings} with workings)")
        
        return validated
        
    except Exception as e:
        logger.error(f"❌ Generation failed: {e}")
        return _create_fallback_question(lesson_text)

def _create_fallback_question(lesson_text: str) -> List[Dict[str, Any]]:
    """Create a fallback question when generation fails"""
    return [{
        "question_text": "Summarize the main concepts covered in this lesson.",
        "answer_text": lesson_text[:200] + "..." if len(lesson_text) > 200 else lesson_text,
        "difficulty": "medium",
        "max_score": 3,
        "option_a": None,
        "option_b": None,
        "option_c": None,
        "option_d": None,
        "correct_option": None,
        "workings": None  # ✅ No workings for conceptual question
    }]