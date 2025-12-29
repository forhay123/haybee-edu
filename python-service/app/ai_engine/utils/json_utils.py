import json
from sqlalchemy.inspection import inspect
from datetime import datetime

# Optional import (used for semantic filtering / deduplication)
try:
    from sentence_transformers import SentenceTransformer, util
    import torch
    _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
except Exception:
    _MODEL = None


# ======================================================
# 🔹 Core Serialization Utilities
# ======================================================

def sqlalchemy_to_dict(obj):
    """Convert a SQLAlchemy model instance to a plain dictionary."""
    d = {}
    for c in inspect(obj).mapper.column_attrs:
        val = getattr(obj, c.key)
        if isinstance(val, datetime):
            d[c.key] = val.isoformat()  # Convert datetime to ISO string
        else:
            d[c.key] = val
    return d


def safe_json_dumps(data, **kwargs):
    """
    Safely serialize Python objects (including SQLAlchemy, Pydantic, datetime, etc.) to JSON.
    Returns JSON string. On failure, returns an error JSON.
    """
    try:
        # Default dump configuration
        dump_args = {
            "default": str,           # handle datetime, Decimal, etc.
            "ensure_ascii": False,
            "indent": 2,
        }
        dump_args.update(kwargs)

        if isinstance(data, list):
            cleaned = []
            for item in data:
                if hasattr(item, "_sa_instance_state"):   # SQLAlchemy model
                    cleaned.append(sqlalchemy_to_dict(item))
                elif hasattr(item, "dict"):               # Pydantic model
                    cleaned.append(item.dict())
                else:
                    cleaned.append(item)
            return json.dumps(cleaned, **dump_args)

        elif hasattr(data, "_sa_instance_state"):
            return json.dumps(sqlalchemy_to_dict(data), **dump_args)

        elif hasattr(data, "dict"):
            return json.dumps(data.dict(), **dump_args)

        else:
            return json.dumps(data, **dump_args)

    except Exception as e:
        return json.dumps({"error": f"Serialization failed: {str(e)}"}, default=str)


def safe_json_loads(json_str):
    """
    Safely parse JSON string into Python objects.
    Returns None if parsing fails instead of raising an exception.
    """
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return None


# ======================================================
# 🧠 Semantic Filtering + Adaptive Utilities
# ======================================================

def semantic_deduplicate(questions, threshold: float = 0.9):
    """
    Removes semantically duplicate questions using SentenceTransformer embeddings.
    Requires the model to be available; otherwise, returns input unchanged.
    """
    if not _MODEL or not questions:
        return questions

    question_texts = [q["question_text"] for q in questions]
    embeddings = _MODEL.encode(question_texts, convert_to_tensor=True, normalize_embeddings=True)
    sim_matrix = util.cos_sim(embeddings, embeddings)

    keep, removed = [], set()
    for i, q in enumerate(questions):
        if i in removed:
            continue
        for j in range(i + 1, len(questions)):
            if sim_matrix[i][j] > threshold:
                removed.add(j)
        keep.append(q)
    return keep


def adaptive_rebalance(questions, target_distribution=None):
    """
    Adjusts the number of easy/medium/hard questions to match a target ratio.
    Example: target_distribution={"easy": 0.4, "medium": 0.4, "hard": 0.2}
    """
    if not questions:
        return []

    if not target_distribution:
        target_distribution = {"easy": 0.4, "medium": 0.4, "hard": 0.2}

    # Group by difficulty
    grouped = {"easy": [], "medium": [], "hard": []}
    for q in questions:
        grouped[q.get("difficulty", "medium")].append(q)

    total = len(questions)
    balanced = []

    for diff, ratio in target_distribution.items():
        needed = int(total * ratio)
        balanced.extend(grouped.get(diff, [])[:needed])

    # Fill any remaining slots with leftover questions
    if len(balanced) < total:
        for diff in ["medium", "easy", "hard"]:
            extras = [q for q in grouped[diff] if q not in balanced]
            take = min(total - len(balanced), len(extras))
            balanced.extend(extras[:take])
            if len(balanced) >= total:
                break

    return balanced
