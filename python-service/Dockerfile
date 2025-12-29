# =========================================
# 🚀 Python FastAPI Service (Fixed OpenCV + Tesseract)
# =========================================

# 1️⃣ Base image
FROM python:3.12-slim AS base

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Install system dependencies (ADDED: Tesseract OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    iputils-ping \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# 4️⃣ Copy ONLY requirements file first (for better layer caching)
COPY requirements.txt .

# 5️⃣ Install dependencies in correct order (NumPy → OpenCV → rest)
RUN pip install --upgrade pip && \
    pip install numpy==1.26.4 && \
    pip install opencv-python-headless==4.10.0.84 && \
    pip install -r requirements.txt

# 6️⃣ Set transformers cache directory
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
RUN mkdir -p /app/.cache/huggingface

# 7️⃣ Pre-download SentenceTransformer model (this layer will be cached)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# 8️⃣ Copy all source code (this comes LAST so code changes don't invalidate above layers)
COPY . .

# 9️⃣ Create necessary directories
RUN mkdir -p /tmp/videos /app/uploads /app/uploads/individual/timetables /app/uploads/individual/schemes

# 🔟 Expose app port
EXPOSE 8000

# 1️⃣1️⃣ Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

# 1️⃣2️⃣ Start FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
