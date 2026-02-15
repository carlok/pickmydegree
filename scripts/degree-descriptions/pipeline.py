#!/usr/bin/env python3
"""
Run the search + LLM pipeline for degree descriptions.
Loads degrees.json, for each degree: fetch snippets → LLM Italian → LLM English → save output/<id>.json.
"""
import argparse
import json
import logging
import sys
from pathlib import Path

from config import DEGREES_JSON, OUTPUT_DIR
from llm import complete
from prompts import SYSTEM_EN, SYSTEM_IT, USER_EN, USER_IT
from search import get_snippets

logger = logging.getLogger(__name__)


def load_degrees(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def run_one(degree: dict, dry_run: bool) -> dict | None:
    """Produce description_it and description_en for one degree. Returns record to save or None."""
    deg_id = degree.get("id", "")
    name = degree.get("name", {})
    name_it = name.get("it", "")
    name_en = name.get("en", "")

    if dry_run:
        return {"id": deg_id, "dry_run": True, "name_it": name_it, "name_en": name_en}

    try:
        logger.info("Processing %s (%s)", deg_id, name_it)
        snippets_list = get_snippets(name_it, name_en)
        snippets = "\n\n".join(snippets_list) if snippets_list else "(Nessun snippet disponibile.)"

        user_it = USER_IT.format(name_it=name_it, name_en=name_en, snippets=snippets)
        description_it = complete(SYSTEM_IT, user_it)
        if not description_it:
            logger.error("%s: LLM Italian returned empty", deg_id)
            return None

        logger.info("%s: Italian description done (%d chars)", deg_id, len(description_it))
        user_en = USER_EN.format(description_it=description_it)
        description_en = complete(SYSTEM_EN, user_en)
        if not description_en:
            description_en = description_it  # fallback
            logger.warning("%s: LLM English empty, using Italian as fallback", deg_id)

        return {
            "id": deg_id,
            "name_it": name_it,
            "name_en": name_en,
            "snippets": snippets_list,
            "description": {"it": description_it, "en": description_en},
        }
    except Exception as e:
        logger.exception("%s: unexpected error: %s", deg_id, e)
        return None


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )

    parser = argparse.ArgumentParser(description="Degree descriptions: search + LLM → per-degree JSON")
    parser.add_argument("--dry-run", action="store_true", help="Only load degrees and list IDs, no search/LLM")
    parser.add_argument("--ids", type=str, default="", help="Comma-separated degree IDs to process (default: all)")
    parser.add_argument("--skip-existing", action="store_true", help="Skip degrees that already have output/<id>.json")
    parser.add_argument("--degrees-json", type=str, default=DEGREES_JSON, help="Path to degrees.json")
    parser.add_argument("-v", "--verbose", action="store_true", help="Log at DEBUG level")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("Loading degrees from %s", args.degrees_json)
    degrees = load_degrees(args.degrees_json)
    if not degrees:
        print("No degrees loaded.", file=sys.stderr)
        return 1

    ids_filter = set(s.strip() for s in args.ids.split(",") if s.strip()) if args.ids else None
    if ids_filter:
        degrees = [d for d in degrees if d.get("id") in ids_filter]
    if not degrees:
        print("No degrees match --ids filter.", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    done = 0
    for degree in degrees:
        deg_id = degree.get("id", "")
        if not deg_id:
            continue
        out_path = OUTPUT_DIR / f"{deg_id}.json"
        if args.skip_existing and out_path.exists():
            print(f"Skip (exists): {deg_id}")
            done += 1
            continue
        if args.dry_run:
            rec = run_one(degree, dry_run=True)
            print(f"Would process: {deg_id} {rec.get('name_it', '')}")
            done += 1
            continue
        rec = run_one(degree, dry_run=False)
        if rec is None:
            logger.error("Failed: %s (see log above)", deg_id)
            print(f"Failed: {deg_id}", file=sys.stderr)
            continue
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=2)
        print(f"Saved: {out_path}")
        done += 1

    print(f"Done: {done} degree(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
