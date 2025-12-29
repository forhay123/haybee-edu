# app/ai_engine/prompt_templates.py

from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "prompt_templates"

def load_prompt_template(filename: str) -> str:
    """
    Load a prompt template from app/ai_engine/prompt_templates/
    """
    file_path = TEMPLATES_DIR / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Prompt template {filename} not found in {TEMPLATES_DIR}")
    return file_path.read_text(encoding="utf-8")
