#!/usr/bin/env python3
"""LLM client: OpenAI or Gemini. One provider is used based on env keys."""
import logging
import re
import time
from typing import Optional

from config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    LLM_DELAY_SEC,
    OPENAI_API_KEY,
    OPENAI_MODEL,
)

logger = logging.getLogger(__name__)

# Retry 429 (rate limit): parse "retry in Xs" from error, sleep, then retry
GEMINI_429_MAX_RETRIES = 3
GEMINI_429_DELAY_CAP_SEC = 120


def _parse_retry_seconds(error: Exception) -> float:
    """Extract suggested retry delay in seconds from Gemini 429 error message."""
    msg = str(error)
    match = re.search(r"retry in (\d+(?:\.\d+)?)\s*s", msg, re.IGNORECASE)
    if match:
        return min(float(match.group(1)), GEMINI_429_DELAY_CAP_SEC)
    return 45.0


def _complete_openai(system: str, user: str) -> Optional[str]:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        r = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
        )
        return (r.choices[0].message.content or "").strip() or None
    except Exception as e:
        logger.exception("OpenAI completion failed: %s", e)
        return None


def _complete_gemini(system: str, user: str) -> Optional[str]:
    try:
        from google import genai
        from google.genai import types
        from google.genai.errors import ClientError
    except ImportError:
        logger.exception("google.genai not available")
        return None

    client = genai.Client(api_key=GEMINI_API_KEY)
    last_error = None
    for attempt in range(1, GEMINI_429_MAX_RETRIES + 1):
        try:
            r = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=user,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.3,
                ),
            )
            if r and getattr(r, "text", None):
                return r.text.strip() or None
            logger.warning("Gemini returned no text; response: %s", r)
            return None
        except ClientError as e:
            last_error = e
            is_429 = (
                getattr(e, "status_code", None) == 429
                or "429" in str(e)
                or "RESOURCE_EXHAUSTED" in str(e)
            )
            if is_429:
                delay = _parse_retry_seconds(e)
                logger.warning(
                    "Gemini 429 rate limit (attempt %d/%d); sleeping %.1fs then retrying",
                    attempt, GEMINI_429_MAX_RETRIES, delay,
                )
                time.sleep(delay)
                continue
            logger.exception("Gemini completion failed: %s", e)
            return None
        except Exception as e:
            logger.exception("Gemini completion failed: %s", e)
            return None

    logger.error(
        "Gemini still 429 after %d retries: %s",
        GEMINI_429_MAX_RETRIES, last_error,
    )
    return None


def complete(system: str, user: str) -> Optional[str]:
    """
    Run one completion. Uses OpenAI if OPENAI_API_KEY is set, else Gemini if GEMINI_API_KEY is set.
    Returns None on failure or if no key is set.
    """
    time.sleep(LLM_DELAY_SEC)
    if OPENAI_API_KEY:
        return _complete_openai(system, user)
    if GEMINI_API_KEY:
        return _complete_gemini(system, user)
    logger.error("No LLM API key set (OPENAI_API_KEY or GEMINI_API_KEY)")
    return None
