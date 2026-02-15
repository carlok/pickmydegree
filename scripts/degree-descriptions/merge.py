#!/usr/bin/env python3
"""
Merge per-degree JSON files from output/ into a full degrees list.
Reads the original degrees.json and every output/<id>.json; for each degree that has
an output file, replaces description (and optionally adds source_url if present).
Writes a new file (e.g. degrees.updated.json) without overwriting the original.
"""
import argparse
import json
import sys
from pathlib import Path

from config import DEGREES_JSON, OUTPUT_DIR


def load_degrees(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge output/*.json into an updated degrees.json copy")
    parser.add_argument("--degrees-json", type=str, default=DEGREES_JSON, help="Path to original degrees.json")
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR, help="Directory with <id>.json files")
    parser.add_argument(
        "--out",
        type=str,
        default="",
        help="Output path for merged file (default: same dir as degrees.json, name degrees.updated.json)",
    )
    args = parser.parse_args()

    degrees_path = Path(args.degrees_json)
    if not degrees_path.exists():
        print(f"Not found: {degrees_path}", file=sys.stderr)
        return 1

    degrees = load_degrees(str(degrees_path))
    if not degrees:
        print("No degrees in input.", file=sys.stderr)
        return 1

    out_dir = Path(args.output_dir)
    if not out_dir.exists():
        print(f"Output dir not found: {out_dir}", file=sys.stderr)
        return 1

    by_id = {}
    for p in out_dir.glob("*.json"):
        if p.name.startswith("degrees"):
            continue
        try:
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            deg_id = data.get("id")
            if deg_id:
                by_id[deg_id] = data
        except (json.JSONDecodeError, OSError):
            continue

    updated = 0
    for d in degrees:
        deg_id = d.get("id")
        if not deg_id or deg_id not in by_id:
            continue
        patch = by_id[deg_id]
        if "description" in patch and isinstance(patch["description"], dict):
            d["description"] = {
                "it": patch["description"].get("it", d.get("description", {}).get("it", "")),
                "en": patch["description"].get("en", d.get("description", {}).get("en", "")),
            }
            updated += 1
        if "source_url" in patch and patch["source_url"]:
            d["source_url"] = patch["source_url"]

    out_path = args.out or str(degrees_path.parent / "degrees.updated.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(degrees, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path} (updated {updated} degree(s)).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
