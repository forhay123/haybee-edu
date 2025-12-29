#!/usr/bin/env python
"""
Clean up old placeholder transcripts so they can be regenerated
"""
import os
import sys

sys.path.insert(0, '/app/app')
os.environ.setdefault('DATABASE_URL', 'postgresql+psycopg2://edu_admin:edu_password@postgres:5432/edu_db')

from core.database import SessionLocal
from models.video_lesson import VideoLesson
from models.video_transcript import VideoTranscript

def cleanup_placeholders():
    print("\n" + "="*60)
    print("🧹 CLEANING UP OLD PLACEHOLDER TRANSCRIPTS")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # Find all placeholder transcripts
        placeholders = db.query(VideoTranscript).filter(
            VideoTranscript.model_used.in_(['placeholder', 'placeholder-error'])
        ).all()
        
        if not placeholders:
            print("✅ No placeholder transcripts found!")
            print("   All transcripts are real.\n")
            return
        
        print(f"Found {len(placeholders)} placeholder transcript(s):\n")
        
        for trans in placeholders:
            video = db.query(VideoLesson).filter_by(id=trans.video_lesson_id).first()
            print(f"  • Video {trans.video_lesson_id}: {video.title if video else 'Unknown'}")
            print(f"    Method: {trans.model_used}")
            print(f"    Chars: {len(trans.full_transcript)}")
        
        print(f"\n❓ Delete these {len(placeholders)} placeholder transcript(s)? (y/n): ", end="")
        response = input().strip().lower()
        
        if response == 'y':
            for trans in placeholders:
                video = db.query(VideoLesson).filter_by(id=trans.video_lesson_id).first()
                if video:
                    video.has_transcript = False
                db.delete(trans)
            
            db.commit()
            print(f"\n✅ Deleted {len(placeholders)} placeholder transcript(s)")
            print("   You can now regenerate them from the UI!\n")
        else:
            print("\n❌ Cancelled. No changes made.\n")
    
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    cleanup_placeholders()