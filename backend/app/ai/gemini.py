"""Gemini client: chat, vision (OCR), and text embedding."""
from __future__ import annotations

import base64
import logging
from typing import Any

import google.generativeai as genai

from app.core.settings import settings

logger = logging.getLogger(__name__)

CHAT_MODEL = "gemini-2.5-flash"
EMBED_MODEL = "models/gemini-embedding-001"


_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to your .env file.")
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


def get_chat_model(
    tools: list[Any] | None = None,
    system_instruction: str | None = None,
) -> genai.GenerativeModel:
    _ensure_configured()
    kwargs: dict[str, Any] = {}
    if tools:
        kwargs["tools"] = tools
    if system_instruction:
        kwargs["system_instruction"] = system_instruction
    return genai.GenerativeModel(CHAT_MODEL, **kwargs)


async def embed_text(text: str) -> list[float]:
    _ensure_configured()
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text,
        task_type="RETRIEVAL_DOCUMENT",
    )
    return result["embedding"]


async def vision_extract(image_bytes: bytes, mime_type: str, prompt: str) -> str:
    _ensure_configured()
    model = get_chat_model()
    b64 = base64.b64encode(image_bytes).decode()
    response = model.generate_content(
        [
            {"mime_type": mime_type, "data": b64},
            prompt,
        ],
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )
    return response.text


async def extract_structured_json(prompt: str, user_text: str) -> str:
    """Extract structured data from user text prompt via Gemini Flash."""
    _ensure_configured()
    model = get_chat_model()
    response = model.generate_content(
        [
            prompt,
            f"User input text:\n{user_text}",
        ],
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )
    return response.text