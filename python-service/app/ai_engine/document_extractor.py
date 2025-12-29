from pathlib import Path
from typing import Union
import pdfplumber
from PIL import Image
import pytesseract
from app.ai_engine.logging_helper import get_logger

logger = get_logger("DocumentExtractor")


def extract_text_from_file(file_path: Union[str, Path]) -> str:
    """
    Extract text from a local file path (PDF, image, or text file).
    Automatically detects file type and logs each stage.
    """
    file_path = Path(file_path)
    logger.info(f"📥 Starting text extraction for: {file_path.name}")

    if not file_path.exists():
        logger.error(f"❌ File not found: {file_path}")
        raise FileNotFoundError(f"File not found at path: {file_path}")

    ext = file_path.suffix.lower()

    try:
        if ext == ".pdf":
            logger.info("🔍 Detected PDF — extracting using pdfplumber.")
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page_no, page in enumerate(pdf.pages, start=1):
                    page_text = page.extract_text() or ""
                    logger.info(f"  • Extracted {len(page_text.split())} words from page {page_no}")
                    text += page_text
            logger.info(f"✅ PDF extraction complete ({len(text.split())} words total).")
            return text.strip()

        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
            logger.info("🖼️ Detected image — extracting using OCR (Tesseract).")
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            logger.info(f"✅ OCR extraction complete ({len(text.split())} words).")
            return text.strip()

        elif ext == ".txt":
            logger.info("📜 Detected text file — reading directly.")
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read().strip()
            logger.info(f"✅ Text file read complete ({len(text.split())} words).")
            return text

        else:
            logger.error(f"⚠️ Unsupported file type: {ext}")
            raise ValueError(f"Unsupported file type: {ext}")

    except Exception as e:
        logger.exception(f"🚨 Extraction failed: {e}")
        raise
