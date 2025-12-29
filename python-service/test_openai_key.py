# test_openai_key.py
from app.ai_engine.openai_client import call_openai_completion

def test_openai_key():
    prompt = "Say 'Hello, world!'"
    try:
        result = call_openai_completion(prompt, max_tokens=5)
        print("✅ OpenAI API key works! Sample output:")
        print(result)
    except Exception as e:
        print("❌ OpenAI API key failed:", e)

if __name__ == "__main__":
    test_openai_key()
