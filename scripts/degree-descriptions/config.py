#!/usr/bin/env python3
"""Load paths and API keys from env for the degree-descriptions pipeline."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Path to the app's degrees.json (read-only input)
DEGREES_JSON = os.environ.get("DEGREES_JSON")
if not DEGREES_JSON:
    # Default: repo root is one level up from scripts/degree-descriptions
    _repo_root = Path(__file__).resolve().parent.parent.parent
    DEGREES_JSON = str(_repo_root / "src" / "data" / "degrees.json")

# Directory where per-degree JSON files are saved
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", Path(__file__).resolve().parent / "output"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Search
SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "").strip()

# LLM (one of these)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

# Model names
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")

# Throttle (seconds between LLM calls)
LLM_DELAY_SEC = float(os.environ.get("LLM_DELAY_SEC", "1.0"))
