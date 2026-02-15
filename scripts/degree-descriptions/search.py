#!/usr/bin/env python3
"""Fetch search snippets for a degree (e.g. Serper API) to use as context for the LLM."""
import json
import logging
from typing import List

import httpx

from config import SERPER_API_KEY

logger = logging.getLogger(__name__)

# One query per degree; both universities in a single Serper call (fewer API calls)
SITES = "site:polito.it OR site:unito.it"
MAX_SNIPPETS = 5


def get_snippets(degree_name_it: str, degree_name_en: str, num: int = MAX_SNIPPETS) -> List[str]:
    """
    Query Serper once for official-looking snippets about the degree from PoliTo or UniTo.
    Returns a list of snippet strings. If SERPER_API_KEY is not set or the request fails,
    returns an empty list.
    """
    if not SERPER_API_KEY:
        logger.warning("SERPER_API_KEY not set; skipping search")
        return []

    query = f'"{degree_name_it}" laurea corso {SITES}'
    payload = {"q": query, "num": num}
    try:
        resp = httpx.post(
            "https://google.serper.dev/search",
            headers={
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError as e:
        logger.warning("Serper HTTP error for %s: %s", degree_name_it, e)
        return []
    except json.JSONDecodeError as e:
        logger.warning("Serper response not JSON for %s: %s", degree_name_it, e)
        return []

    snippets = []
    for item in data.get("organic", [])[:num]:
        s = (item.get("snippet") or "").strip()
        if s:
            snippets.append(s)
    logger.info("Search returned %d snippet(s) for %s", len(snippets), degree_name_it)
    return snippets
