import os
from openai import OpenAI
from app.core.config import settings

# Create a reusable OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

def call_openai_completion(
    prompt: str,
    model: str = None,
    max_tokens: int = 4000,  # ✅ Increased from 500 to 4000
    response_format: str = None,
    temperature: float = 0.7  # ✅ Added for better variety
) -> str:
    """
    Call OpenAI's Chat Completions API (supports JSON mode).

    Args:
        prompt (str): The user prompt to generate content from.
        model (str, optional): Model to use. Defaults to settings.OPENAI_MODEL.
        max_tokens (int, optional): Max tokens to generate. Defaults to 4000.
        response_format (str, optional): Set to "json" to enable JSON mode output.
        temperature (float, optional): Controls randomness (0.0-2.0). Defaults to 0.7.

    Returns:
        str: Generated text or JSON string from OpenAI
    """
    model_to_use = model or settings.OPENAI_MODEL

    # Build message payload
    messages = [{"role": "user", "content": prompt}]

    try:
        if response_format == "json":
            # ✅ Use structured JSON mode (if supported by model)
            response = client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=max_tokens,
                temperature=temperature
            )
            result = response.choices[0].message.content
        else:
            # ✅ Normal text mode
            response = client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            result = response.choices[0].message.content

        return result.strip()

    except Exception as e:
        raise RuntimeError(f"OpenAI completion failed: {e}") from e