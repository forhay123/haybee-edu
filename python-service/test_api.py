"""
Test Video Processing API
"""
import requests
import time

BASE_URL = "http://localhost:8000"

def test_health():
    """Test if API is running"""
    print("🧪 Testing API health...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"✅ API Health: {response.json()}")

def test_video_processing():
    """Test video processing endpoint"""
    print("\n🧪 Testing video processing...")
    
    # Note: You'll need a real video first!
    # For now, just test that endpoint exists
    response = requests.post(
        f"{BASE_URL}/video-processing/process",
        json={
            "videoId": 999,  # Fake ID for testing
            "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "subjectId": 1
        }
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 202:
        data = response.json()
        print(f"✅ Job started: {data['jobId']}")
        return data['jobId']
    elif response.status_code == 404:
        print("⚠️ Video not found (expected - video doesn't exist in DB)")
    else:
        print(f"Response: {response.text}")

def test_watch_event():
    """Test analytics endpoint"""
    print("\n🧪 Testing watch event tracking...")
    
    response = requests.post(
        f"{BASE_URL}/video-analytics/watch-event",
        json={
            "videoId": 1,
            "studentId": 1,
            "position": 120,
            "duration": 30,
            "completed": False
        }
    )
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print(f"✅ Watch event logged: {response.json()}")
    else:
        print(f"Response: {response.text}")

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 API Testing")
    print("=" * 60)
    
    test_health()
    test_video_processing()
    test_watch_event()
    
    print("\n" + "=" * 60)
    print("✅ API Testing Complete!")
    print("=" * 60)