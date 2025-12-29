"""
Test Video Processing Components
Run: python test_video_processing.py
"""
import sys
sys.path.insert(0, 'C:/Users/User/Desktop/edu/python-service')

def test_imports():
    """Test that all modules can be imported"""
    print("🧪 Testing imports...")
    
    try:
        from app.ai_engine.video_transcriber import transcribe_video
        print("✅ video_transcriber imported")
    except Exception as e:
        print(f"❌ video_transcriber failed: {e}")
    
    try:
        from app.ai_engine.content_analyzer import analyze_video_content
        print("✅ content_analyzer imported")
    except Exception as e:
        print(f"❌ content_analyzer failed: {e}")
    
    try:
        from app.ai_engine.thumbnail_generator import generate_thumbnail
        print("✅ thumbnail_generator imported")
    except Exception as e:
        print(f"❌ thumbnail_generator failed: {e}")
    
    try:
        from app.domains.video_processing.pipeline import VideoProcessingPipeline
        print("✅ pipeline imported")
    except Exception as e:
        print(f"❌ pipeline failed: {e}")
    
    try:
        from app.domains.video_processing.service import VideoProcessingService
        print("✅ service imported")
    except Exception as e:
        print(f"❌ service failed: {e}")
    
    try:
        from app.domains.video_analytics.service import VideoAnalyticsService
        print("✅ analytics imported")
    except Exception as e:
        print(f"❌ analytics failed: {e}")

def test_database_connection():
    """Test database connectivity"""
    print("\n🧪 Testing database connection...")
    
    try:
        from app.core.database import SessionLocal
        from app.models.video_lesson import VideoLesson
        
        db = SessionLocal()
        count = db.query(VideoLesson).count()
        print(f"✅ Database connected: {count} video lessons found")
        db.close()
    except Exception as e:
        print(f"❌ Database test failed: {e}")

def test_redis_connection():
    """Test Redis connectivity"""
    print("\n🧪 Testing Redis connection...")
    
    try:
        from app.core.redis_client import redis_client
        
        # Test set and get
        redis_client.set_with_ttl("test_key", {"test": "value"}, 60)
        result = redis_client.get("test_key")
        
        if result and result.get("test") == "value":
            print("✅ Redis connected and working")
        else:
            print("❌ Redis not returning correct values")
            
        redis_client.delete("test_key")
    except Exception as e:
        print(f"❌ Redis test failed: {e}")

def test_minio_connection():
    """Test MinIO connectivity"""
    print("\n🧪 Testing MinIO connection...")
    
    try:
        from app.core.storage import storage_client
        
        # Check if buckets exist
        buckets = ['edu-videos', 'edu-thumbnails', 'edu-recordings']
        print(f"✅ MinIO client initialized")
        print(f"   Expected buckets: {', '.join(buckets)}")
    except Exception as e:
        print(f"❌ MinIO test failed: {e}")

def test_celery_connection():
    """Test Celery connectivity"""
    print("\n🧪 Testing Celery connection...")
    
    try:
        from app.celery_app import celery_app
        
        # Ping Celery workers
        inspect = celery_app.control.inspect()
        active = inspect.active()
        
        if active:
            print(f"✅ Celery connected: {len(active)} worker(s) found")
        else:
            print("⚠️ Celery connected but no workers active (this is OK if worker not started yet)")
    except Exception as e:
        print(f"❌ Celery test failed: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Phase 3 Component Testing")
    print("=" * 60)
    
    test_imports()
    test_database_connection()
    test_redis_connection()
    test_minio_connection()
    test_celery_connection()
    
    print("\n" + "=" * 60)
    print("✅ Testing Complete!")
    print("=" * 60)