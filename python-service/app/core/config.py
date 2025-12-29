# app/core/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Find the .env file in the project root (two levels up from this file)
BASE_DIR = Path(__file__).resolve().parents[1]
env_path = BASE_DIR.parent / ".env"

print(f"Loading .env from: {env_path}")  # Optional for debugging
load_dotenv(env_path)

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_SCHEMA: str = os.getenv("DB_SCHEMA", "public")

    # Java callback service
    JAVA_SERVICE_URL: str = os.getenv("JAVA_SERVICE_URL", "")
    SERVICE_API_KEY: str = os.getenv("SERVICE_API_KEY", "")

    # Flags
    USE_OPENAI_IF_OLLAMA_FAILS: bool = os.getenv("USE_OPENAI_IF_OLLAMA_FAILS", "false").lower() == "true"
    USE_TOGETHER_IF_OLLAMA_FAILS: bool = os.getenv("USE_TOGETHER_IF_OLLAMA_FAILS", "false").lower() == "true"

    # Security & JWT
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    SYSTEM_TOKEN: str = os.getenv("SYSTEM_TOKEN", "")   # <--- Added here

    # File paths
    PDF_FOLDER: str = os.getenv("PDF_FOLDER", "data/lesson_pdfs")
    CHROMA_DB_DIR: str = os.getenv("CHROMA_DB_DIR", "backend/app/chroma_db")

    # Models
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    SERVER_URL: str = os.getenv("SERVER_URL", "http://localhost:8000")

settings = Settings()
