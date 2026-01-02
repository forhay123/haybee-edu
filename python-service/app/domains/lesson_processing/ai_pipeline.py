from typing import List, Dict, Any, Optional
from pathlib import Path
import os
import json
import hashlib
import pickle
import logging
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.models.lesson_question import LessonQuestion
from app.ai_engine.document_extractor import extract_text_from_file
from app.ai_engine.question_generator import generate_questions_with_ai
from app.ai_engine.utils.json_utils import safe_json_dumps, sqlalchemy_to_dict

logger = logging.getLogger("LessonPipeline")
logger.setLevel(logging.INFO)

# ----------------------------
# Config toggles
# ----------------------------
ENABLE_SEMANTIC_FILTER_GLOBAL = True
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
CACHE_DIR = Path(".cache/embeddings")
CACHE_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_JSON_DIR = Path(".cache/generated_questions")
GENERATED_JSON_DIR.mkdir(parents=True, exist_ok=True)

JAVA_API_URL = os.getenv("JAVA_API_URL", "http://java-service:8080/api/v1/lesson-topics")
SYSTEM_TOKEN = settings.SYSTEM_TOKEN

# ----------------------------
# Embedding cache helpers
# ----------------------------
_sentence_model = None

def get_sentence_model():
    global _sentence_model
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
        except Exception as e:
            logger.warning(f"⚠️ sentence-transformers not available: {e}")
            raise
        logger.info(f"🔤 Loading sentence-transformers model ({EMBEDDING_MODEL_NAME})...")
        _sentence_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info("✅ Model loaded successfully.")
    return _sentence_model

def _hash_texts(texts: List[str]) -> str:
    joined = "|".join([t.strip().lower() for t in texts])
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()

def _cache_path(hash_key: str) -> Path:
    return CACHE_DIR / f"{hash_key}.pkl"

def get_embeddings_cached(texts: List[str]) -> List[List[float]]:
    model = get_sentence_model()
    cache_key = _hash_texts(texts)
    cache_file = _cache_path(cache_key)

    if cache_file.exists():
        try:
            with open(cache_file, "rb") as f:
                logger.info(f"💾 Using cached embeddings: {cache_file.name}")
                return pickle.load(f)
        except Exception as e:
            logger.warning(f"⚠️ Failed to read cache {cache_file}: {e}")

    logger.info(f"🧠 Computing {len(texts)} embeddings (cache miss)...")
    embeddings = model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)

    try:
        with open(cache_file, "wb") as f:
            pickle.dump(embeddings, f)
        logger.info(f"✅ Saved embeddings to cache: {cache_file.name}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to write cache: {e}")

    return embeddings

# ----------------------------
# Semantic dedupe
# ----------------------------
def semantic_dedupe(questions: List[Dict[str, Any]], threshold: float = 0.85) -> List[Dict[str, Any]]:
    if not questions:
        return []
    texts = [q.get("question_text", "") for q in questions]
    embeddings = get_embeddings_cached(texts)
    selected, selected_embs = [], []
    for i, q in enumerate(questions):
        e = embeddings[i]
        keep = True
        for s_emb in selected_embs:
            sim = float(e @ s_emb)  # cosine similarity
            if sim >= threshold:
                keep = False
                break
        if keep:
            selected.append(q)
            selected_embs.append(e)
    logger.info(f"🧹 Semantic dedupe: {len(questions)} → {len(selected)} (threshold={threshold})")
    return selected

# ----------------------------
# Difficulty ratio enforcement
# ----------------------------
def enforce_difficulty_ratio(
    candidates: List[Dict[str, Any]],
    total_needed: int,
    ratios: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    ratios = ratios or {"easy": 0.3, "medium": 0.4, "hard": 0.3}
    desired = {k: int(round(total_needed * v)) for k, v in ratios.items()}
    diff = total_needed - sum(desired.values())
    keys = ["medium", "easy", "hard"]
    i = 0
    while diff != 0:
        key = keys[i % len(keys)]
        desired[key] += 1 if diff > 0 else -1
        diff = total_needed - sum(desired.values())
        i += 1

    buckets = {"easy": [], "medium": [], "hard": []}
    for c in candidates:
        d = (c.get("difficulty") or "medium").lower()
        if d not in buckets:
            d = "medium"
        buckets[d].append(c)

    selected = []
    for k in ["easy", "medium", "hard"]:
        available = buckets.get(k, [])
        take = min(len(available), desired.get(k, 0))
        selected.extend(available[:take])

    if len(selected) < total_needed:
        remaining = [r for b in buckets.values() for r in b if r not in selected]
        selected.extend(remaining[: (total_needed - len(selected))])

    return selected[:total_needed]

# ----------------------------
# Report progress to backend
# ----------------------------
def report_ai_progress(lesson_topic_id: int, status: str, progress: int, question_count: int = None):
    """
    Reports AI processing progress to Java backend.
    
    Args:
        lesson_topic_id: The academic.lesson_topics.id
        status: processing, done, failed
        progress: 0-100
        question_count: Number of questions generated
    """
    import requests
    try:
        payload = {"status": status, "progress": progress}
        if question_count is not None:
            payload["questionCount"] = int(question_count)

        logger.info(f"📡 Reporting to Java: lesson_topic_id={lesson_topic_id}, status={status}, progress={progress}, count={question_count}")

        base_url = JAVA_API_URL
        if not base_url.endswith("/lesson-topics"):
            base_url = base_url.rstrip("/") + "/lesson-topics"
        
        url = f"{base_url}/{lesson_topic_id}/ai-status"
        logger.info(f"📍 Full URL: {url}")
        
        resp = requests.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {SYSTEM_TOKEN}", "Content-Type": "application/json"},
            timeout=10
        )
        if resp.status_code != 200:
            logger.warning(f"⚠️ Failed to report AI status ({resp.status_code}): {resp.text}")
        else:
            logger.info(f"✅ Reported AI status successfully.")
    except Exception as e:
        logger.warning(f"⚠️ Could not report AI status: {e}")

# ----------------------------
# Save generated questions JSON
# ----------------------------
def save_generated_questions_json(lesson_topic_id: int, questions: List[Dict[str, Any]]):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = GENERATED_JSON_DIR / f"lesson_{lesson_topic_id}_{timestamp}.json"
    try:
        serializable = [sqlalchemy_to_dict(q) if hasattr(q, "_sa_instance_state") else q for q in questions]
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, ensure_ascii=False, indent=2)
        logger.info(f"💾 Saved {len(serializable)} questions to JSON for QA: {file_path}")
    except Exception as e:
        logger.warning(f"⚠️ Failed to save generated questions JSON: {e}")

# ----------------------------
# Main AI pipeline (FIXED TARGET: 30 QUESTIONS)
# ----------------------------
def generate_questions_from_lesson(
    lesson_text: Optional[str] = None,
    lesson_ai_result_id: int = None,
    lesson_topic_id: int = None,
    db: Session = None,
    file_path: Optional[str] = None,
    chunk_size: int = 2500,
    max_questions_per_chunk: int = 15,  # ✅ Back to reasonable 15 per chunk
    total_max_questions: int = 30,  # ✅ FIXED: Changed from 150 to 30
    difficulty_ratios: Dict[str, float] = None,
    semantic_threshold: float = 0.85
) -> List[LessonQuestion]:
    """
    Generate and persist AI-generated questions for a lesson.
    
    Args:
        lesson_ai_result_id: ai.lesson_ai_results.id (for saving questions)
        lesson_topic_id: academic.lesson_topics.id (for reporting to Java)
        total_max_questions: Target number of questions (default: 30)
    """

    # --- Validate input ---
    if not lesson_text and not file_path:
        raise ValueError("Either lesson_text or file_path must be provided.")
    
    if not lesson_ai_result_id:
        raise ValueError("lesson_ai_result_id is required")
    
    if not lesson_topic_id:
        raise ValueError("lesson_topic_id is required for reporting progress")

    logger.info(f"🚀 Starting AI pipeline: ai_result_id={lesson_ai_result_id}, lesson_topic_id={lesson_topic_id}")
    logger.info(f"🎯 Target: {total_max_questions} questions")

    # --- Choose input source ---
    if lesson_text:
        text = lesson_text.strip()
        logger.info("📘 Using provided lesson text for AI generation.")
    else:
        path = Path(file_path)
        if not path.exists():
            logger.error(f"❌ File not found: {file_path}")
            raise FileNotFoundError(f"File not found: {file_path}")
        text = extract_text_from_file(path)
        logger.info(f"📄 Extracted {len(text.split())} words from file.")

    if not text.strip():
        text = "No text available for this lesson."

    report_ai_progress(lesson_topic_id, "processing", 10)

    # ✅ Adaptive strategy: for short lessons, don't chunk
    words = text.split()
    word_count = len(words)
    
    if word_count < 3000:  # Short lesson - single call
        logger.info(f"📝 Short lesson ({word_count} words) - using single AI call")
        try:
            candidates = generate_questions_with_ai(
                text, 
                max_questions=total_max_questions,
                enable_semantic_filter=False
            )
            report_ai_progress(lesson_topic_id, "processing", 60)
        except Exception as e:
            logger.exception(f"⚠️ Generation failed: {e}")
            candidates = []
    else:
        # Long lesson - chunk processing
        chunks = [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
        logger.info(f"✂️ Long lesson ({word_count} words) - split into {len(chunks)} chunks (max {chunk_size} words each).")

        # --- Generate candidates ---
        candidates: List[Dict[str, Any]] = []
        for i, chunk in enumerate(chunks, start=1):
            logger.info(f"🧩 Chunk {i}/{len(chunks)} | Requesting up to {max_questions_per_chunk} questions from AI")
            try:
                chunk_candidates = generate_questions_with_ai(
                    chunk, 
                    max_questions=max_questions_per_chunk,
                    enable_semantic_filter=False
                )
                if chunk_candidates:
                    candidates.extend(chunk_candidates)
                report_ai_progress(lesson_topic_id, "processing", 10 + int(50 * i / max(len(chunks), 1)))
            except Exception as e:
                logger.exception(f"⚠️ Generation failed for chunk {i}: {e}")
                continue

    if not candidates:
        logger.warning("⚠️ No candidates produced by AI. Inserting fallback question.")
        q = LessonQuestion(
            lesson_id=lesson_ai_result_id,
            question_text="What is the main idea of this lesson?",
            answer_text=text[:150] + ("..." if len(text) > 150 else ""),
            difficulty="medium",
            max_score=1
        )
        db.add(q)
        db.commit()
        report_ai_progress(lesson_topic_id, "done", 100, 1)
        save_generated_questions_json(lesson_topic_id, [sqlalchemy_to_dict(q)])
        return [q]

    logger.info(f"🔎 Collected {len(candidates)} raw candidate questions from AI.")

    # --- Global semantic dedupe ---
    try:
        sem_filtered = semantic_dedupe(candidates, threshold=semantic_threshold) if ENABLE_SEMANTIC_FILTER_GLOBAL else candidates
    except Exception as e:
        logger.warning(f"⚠️ Global semantic dedupe failed: {e}")
        sem_filtered = candidates

    logger.info(f"🔬 {len(sem_filtered)} questions remain after semantic dedupe.")

    # --- Difficulty selection ---
    difficulty_ratios = difficulty_ratios or {"easy": 0.3, "medium": 0.4, "hard": 0.3}
    total_needed = min(total_max_questions, len(sem_filtered))
    selected = enforce_difficulty_ratio(sem_filtered, total_needed, ratios=difficulty_ratios)
    logger.info(f"🎯 Selected {len(selected)} questions after difficulty filtering.")
    report_ai_progress(lesson_topic_id, "processing", 85, len(selected))

    # --- Save to DB ---
    saved, seen_texts = [], set()
    for s in selected:
        q_text = (s.get("question_text") or "").strip()
        if not q_text or q_text.lower() in seen_texts:
            continue
        seen_texts.add(q_text.lower())

        ans = (s.get("answer_text") or "").strip() if s.get("answer_text") else None
        if not ans:
            correct_opt = s.get("correct_option")
            if correct_opt:
                option_map = {
                    "A": s.get("option_a"),
                    "B": s.get("option_b"),
                    "C": s.get("option_c"),
                    "D": s.get("option_d"),
                }
                ans = option_map.get(correct_opt.upper())
            ans = ans or "Not provided"

        # clean empty options
        for opt_key in ["option_a", "option_b", "option_c", "option_d"]:
            if s.get(opt_key) is not None and not str(s[opt_key]).strip():
                s[opt_key] = None

        db_q = LessonQuestion(
            lesson_id=lesson_ai_result_id,
            question_text=q_text,
            answer_text=ans,
            difficulty=s.get("difficulty", "medium"),
            max_score=s.get("max_score", 1),
            option_a=s.get("option_a"),
            option_b=s.get("option_b"),
            option_c=s.get("option_c"),
            option_d=s.get("option_d"),
            correct_option=s.get("correct_option")
        )
        db.add(db_q)
        saved.append(db_q)

    db.commit()
    for s in saved:
        try:
            db.refresh(s)
        except Exception:
            pass

    total_questions = len(saved)
    logger.info(f"🎉 Completed AI pipeline | Total saved: {total_questions}")
    save_generated_questions_json(lesson_topic_id, [sqlalchemy_to_dict(q) for q in saved])
    report_ai_progress(lesson_topic_id, "done", 100, total_questions)

    return saved