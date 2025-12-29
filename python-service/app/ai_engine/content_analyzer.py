"""
AI Content Analyzer - GPT-4 powered content analysis
Extracts key concepts, generates summaries, and detects chapters
"""
from typing import List, Dict
from openai import OpenAI
from app.core.config import settings
from app.core.logger import get_logger
import json

logger = get_logger(__name__)
client = OpenAI(api_key=settings.OPENAI_API_KEY)


def extract_key_concepts(transcript: str, max_concepts: int = 10) -> List[str]:
    """
    Extract main concepts from video transcript using GPT-4
    
    Args:
        transcript: Full video transcript
        max_concepts: Maximum number of concepts to extract
    
    Returns:
        List of key concept strings
    """
    logger.info(f"🧠 Extracting key concepts from transcript ({len(transcript.split())} words)...")
    
    prompt = f"""Extract the {max_concepts} most important concepts and topics discussed in this educational video transcript.
    
Focus on:
- Main educational topics
- Key definitions and terminology
- Important theories or principles
- Core learning objectives

Return ONLY a JSON array of strings, like: ["concept1", "concept2", ...]

Transcript:
{transcript[:4000]}  # Limit to first 4000 chars to avoid token limits
"""
    
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert educational content analyzer. Extract key concepts from educational videos."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        result = response.choices[0].message.content
        concepts = json.loads(result)
        
        # Handle both array and object responses
        if isinstance(concepts, dict):
            concepts = concepts.get('concepts', [])
        
        logger.info(f"✅ Extracted {len(concepts)} key concepts")
        return concepts[:max_concepts]
        
    except Exception as e:
        logger.error(f"❌ Concept extraction failed: {e}")
        return []


def generate_summary(transcript: str, max_words: int = 200) -> str:
    """
    Generate a concise summary of the video content
    
    Args:
        transcript: Full video transcript
        max_words: Maximum words in summary
    
    Returns:
        Summary text
    """
    logger.info(f"📝 Generating summary ({max_words} words max)...")
    
    prompt = f"""Summarize this educational video transcript in {max_words} words or less.

Focus on:
- Main learning objectives
- Key topics covered
- Important takeaways

Be concise and educational.

Transcript:
{transcript[:5000]}
"""
    
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert at creating clear, concise educational summaries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=400
        )
        
        summary = response.choices[0].message.content.strip()
        logger.info(f"✅ Summary generated ({len(summary.split())} words)")
        return summary
        
    except Exception as e:
        logger.error(f"❌ Summary generation failed: {e}")
        return ""


def detect_chapters(transcript: str, video_duration_seconds: int, segments: List[Dict] = None) -> List[Dict]:
    """
    Detect natural chapter breaks in video using AI
    
    Args:
        transcript: Full video transcript
        video_duration_seconds: Total video duration
        segments: Optional transcript segments with timestamps
    
    Returns:
        List of chapter dicts with {chapter_number, title, start_time, end_time, summary}
    """
    logger.info(f"📚 Detecting chapters for {video_duration_seconds}s video...")
    
    # Split transcript into roughly 5-minute segments
    words = transcript.split()
    words_per_minute = len(words) / (video_duration_seconds / 60)
    words_per_segment = int(words_per_minute * 5)  # 5-minute chunks
    
    segments_text = []
    for i in range(0, len(words), words_per_segment):
        segment_text = ' '.join(words[i:i + words_per_segment])
        segments_text.append(segment_text)
    
    chapters = []
    
    for idx, segment_text in enumerate(segments_text):
        start_time = int((idx * words_per_segment / words_per_minute) * 60)
        end_time = min(start_time + 300, video_duration_seconds)  # 5 minutes or end of video
        
        # Generate chapter title for this segment
        prompt = f"""Analyze this segment of an educational video and provide:
1. A concise chapter title (max 5 words)
2. A brief summary (1-2 sentences)

Return ONLY a JSON object with keys: "title" and "summary"

Segment text:
{segment_text[:1000]}
"""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert at creating educational video chapter titles."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=150,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            chapter = {
                'chapter_number': idx + 1,
                'title': result.get('title', f'Chapter {idx + 1}'),
                'start_time': start_time,
                'end_time': end_time,
                'summary': result.get('summary', ''),
                'key_concepts': []  # Can be populated later
            }
            
            chapters.append(chapter)
            logger.info(f"  📖 Chapter {idx + 1}: {chapter['title']} ({start_time}s - {end_time}s)")
            
        except Exception as e:
            logger.error(f"❌ Chapter {idx + 1} detection failed: {e}")
            # Add fallback chapter
            chapters.append({
                'chapter_number': idx + 1,
                'title': f'Section {idx + 1}',
                'start_time': start_time,
                'end_time': end_time,
                'summary': '',
                'key_concepts': []
            })
    
    logger.info(f"✅ Detected {len(chapters)} chapters")
    return chapters


def analyze_video_content(transcript: str, video_duration_seconds: int, segments: List[Dict] = None) -> Dict:
    """
    Full content analysis: concepts + summary + chapters
    
    Args:
        transcript: Full video transcript
        video_duration_seconds: Total video duration
        segments: Optional transcript segments with timestamps
    
    Returns:
        Dict with all analysis results
    """
    logger.info(f"🔍 Starting full video content analysis...")
    
    try:
        # Run all analyses
        concepts = extract_key_concepts(transcript)
        summary = generate_summary(transcript)
        chapters = detect_chapters(transcript, video_duration_seconds, segments)
        
        result = {
            'key_concepts': concepts,
            'summary': summary,
            'chapters': chapters,
            'success': True
        }
        
        logger.info(f"✅ Content analysis complete")
        return result
        
    except Exception as e:
        logger.error(f"❌ Content analysis failed: {e}")
        return {
            'key_concepts': [],
            'summary': '',
            'chapters': [],
            'success': False,
            'error': str(e)
        }
