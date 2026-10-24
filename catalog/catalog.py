#!/usr/bin/env python3
"""Refresh the course catalogue for PickMyDegree (PoliTo and UniTo only, for now).

Subcommands (run from the repository root, standard library only):

  fetch      download the three sources into catalog/.cache/ (honours robots.txt crawl delays)
  normalise  merge the cached sources into catalog/out/courses.json
  diff       compare courses.json with src/data/degrees.json through catalog/mapping.json
  suggest    propose mapping.json entries for degrees.json cards that have none
  enrich     set `university` and `url` on mapped cards in degrees.json (dry run; add --write to save)
  all        fetch, normalise, diff

Sources (see PROMPT.md for why these three):
  polito  https://www.polito.it/open-data/corsi-di-studio        (CSV, cp1252)  + course pages for URLs
  unito   https://www.unito.it/didattica/offerta-formativa/corsi-di-studio   (paginated HTML listing)
  mur     MUR Ufficio di Statistica "Offerta formativa 2010-2025"  (CSV, cp1252), used as a cross-check

Only `enrich --write` touches src/data/degrees.json, and only the `university` and `url` fields of cards whose
mapped programmes are in the catalogue. Everything else (names, descriptions, tags, new or removed cards) is a
human decision informed by the diff report. Reports go to catalog/out/.
Run it as: python3 -I catalog/catalog.py <command>
"""
import argparse
import csv
import difflib
import html as htmllib
import io
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache"
OUT = ROOT / "out"
SITE_DATA = ROOT.parent / "src" / "data" / "degrees.json"
MAPPING = ROOT / "mapping.json"
OVERRIDES = ROOT / "overrides.json"

UA = "PickMyDegree-catalog/1.0 (+https://github.com/carlok/pickmydegree)"

POLITO_LANDING = "https://www.polito.it/open-data/corsi-di-studio"
POLITO_LIST = "https://www.polito.it/didattica/corsi-di-laurea"
UNITO_INDEX = "https://www.unito.it/didattica/offerta-formativa/corsi-di-studio"
UNITO_HOST = "https://www.unito.it"
MUR_CSV = (
    "https://dati-ustat.mur.gov.it/dataset/bed0c71e-9f86-4a0f-a266-963b6f7bbbd2/resource/"
    "c0e63906-7190-4568-892b-0cf399f56071/download/03_offertaformativa-corsidilaurea_2010-2025.csv"
)
MUR_ATENEI = {"Torino": "unito", "Torino Politecnico": "polito"}

UNITO_CRAWL_DELAY = 5  # seconds, from unito.it/robots.txt
UNITO_MAX_PAGES = 40

# Only first-cycle and single-cycle degrees go into the game (see welcome.data_source in the locale files).
GAME_TYPES = {"L", "LMCU"}


# --------------------------------------------------------------------------- text helpers

def fold(text):
    """Casefolded, accent-free, punctuation-free key: "Dell'Età" -> "delleta"; "A & B" -> "a b"."""
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    text = re.sub(r"[’'`´]", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()


def slugify(text):
    """PoliTo-style slug: apostrophes separate words ("dell'autoveicolo" -> "dell-autoveicolo")."""
    return fold(re.sub(r"[\u2019'`\u00b4]", " ", text or "")).replace(" ", "-")


def sentence_case(name):
    name = re.sub(r"\s+", " ", name or "").strip().lower()
    return name[:1].upper() + name[1:]


def split_parenthetical(name):
    """"A (B)" -> ("A", "B"); "A" -> ("A", None). PoliTo writes the other language in brackets."""
    m = re.match(r"^(.*?)\s*\(([^()]*)\)\s*$", name.strip())
    return (m.group(1).strip(), m.group(2).strip()) if m else (name.strip(), None)


# Ministerial class codes: L-18, LM-77, L-P03 (professionalising), L/SNT1 (health professions), L/DS (defence),
# L-Sc.Mat. (materials science), LMR/02 and LMG/01 (single-cycle). Old 509/99 codes ("10", "4/S") don't match.
CLASS_RE = re.compile(r"^((?:LMR|LMG|LM|L)[-/][A-Za-z0-9][A-Za-z0-9.]*)")


def class_code(raw):
    """"L-18 R - Scienze dell'economia" -> "L-18"; "LMG/01" stays; old 509/99 codes -> None."""
    m = CLASS_RE.match((raw or "").strip())
    return m.group(1).rstrip(".") if m else None


def class_type(code, hint=""):
    hint = fold(hint)
    if code and (code.startswith("LMR/") or code.startswith("LMG/")):
        return "LMCU"
    if "ciclo unico" in hint:
        return "LMCU"
    if code and code.startswith("LM"):
        return "LM"
    if hint.startswith("laurea magistrale") or "magistrale" in hint:
        return "LM"
    return "L"


def clean_name(name):
    """Drop suffixes that differ between sources for the same programme: campus replicas and the
    "abilitante alla professione..." qualifier (MUR and the UniTo site spell these differently)."""
    name = re.sub(r"\s*\(\s*(?:abilitante|replica)\b[^)]*\)?", "", name or "", flags=re.I)  # UniTo: "X (ABILITANTE ...)"
    name = re.sub(r"\s+replica\b.*$", "", name, flags=re.I)                                   # MUR: "X REPLICA CUNEO"
    name = re.sub(r"\s+abilitante\b.*$", "", name, flags=re.I)                                # MUR: "X ABILITANTE ALLA ..."
    return name.strip()


# --------------------------------------------------------------------------- HTTP with cache

def _meta_path(path):
    return path.with_name(path.name + ".meta.json")


def fetch(url, dest, max_age_hours=20, refresh=False, delay=0):
    """GET url into dest; conditional on the cached ETag/Last-Modified. Returns (bytes, meta)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    meta_file = _meta_path(dest)
    meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
    if dest.exists() and not refresh and meta.get("retrieved"):
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(meta["retrieved"])).total_seconds() / 3600
        if age < max_age_hours:
            return dest.read_bytes(), meta
    headers = {"User-Agent": UA}
    if dest.exists() and not refresh:
        if meta.get("etag"):
            headers["If-None-Match"] = meta["etag"]
        if meta.get("last_modified"):
            headers["If-Modified-Since"] = meta["last_modified"]
    if delay:
        time.sleep(delay)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read()
            meta = {
                "url": url,
                "etag": resp.headers.get("ETag"),
                "last_modified": resp.headers.get("Last-Modified"),
                "retrieved": datetime.now(timezone.utc).isoformat(),
                "bytes": len(body),
            }
    except urllib.error.HTTPError as e:
        if e.code == 304 and dest.exists():
            meta["retrieved"] = datetime.now(timezone.utc).isoformat()
            meta_file.write_text(json.dumps(meta, indent=2))
            return dest.read_bytes(), meta
        raise
    dest.write_bytes(body)
    meta_file.write_text(json.dumps(meta, indent=2))
    return body, meta


# --------------------------------------------------------------------------- parsers

def parse_polito_csv(raw):
    """Latest academic year, programmes that still accept enrolments, first-cycle only."""
    rows = list(csv.DictReader(io.StringIO(raw.decode("cp1252")), delimiter=";"))
    if not rows:
        return [], None
    year = max(int(r["A_ACC"]) for r in rows if r["A_ACC"].isdigit())
    out = []
    for r in rows:
        if r["A_ACC"] != str(year) or r["ACCETTA_IMMA"].strip().upper() != "S":
            continue
        code = class_code(r["COD_CLASSE"])
        tipo = class_type(code, r["DESCRIZIONE"])
        if code is None or tipo not in GAME_TYPES:
            continue
        name = r["NOME_CDL"].strip()
        primary, other = split_parenthetical(name)
        out.append({"anno": year, "tipo": tipo, "classe": code, "nome": primary, "alt_nome": other})
    return out, year


def polito_course_links(page_html):
    """{slug: absolute url} for bachelor pages listed on the PoliTo catalogue page."""
    links = {}
    for href in re.findall(r'href="((?:https://www\.polito\.it)?/didattica/corsi-di-laurea/[^"#?]+)"', page_html):
        path = href.replace("https://www.polito.it", "")
        links["/".join(path.split("/")[-1:])] = "https://www.polito.it" + path
    return links


def match_polito_slug(names, links):
    """Find the course page for a programme. PoliTo truncates long slugs, so prefix matches count."""
    candidates = [slugify(n) for n in names if n]
    for slug, url in links.items():
        for c in candidates:
            if slug == c or (len(slug) >= 20 and c.startswith(slug)):
                return url
    return None


def _card_text(chunk):
    chunk = re.sub(
        r"(?is)<script\b[^>]*>.*?</script[^>]*>|<style\b[^>]*>.*?</style[^>]*>",
        "",
        chunk,
    )
    text = htmllib.unescape(re.sub(r"<[^>]+>", "|", chunk))
    return re.sub(r"\|\s*(\|\s*)*", "|", text)


def parse_unito_page(page_html):
    """Cards on one UniTo listing page -> list of dicts (name, url, class, type, access, language, sede)."""
    cards = page_html.split('class="card border-0 box-shadow card-body')[1:]
    out = []
    for chunk in cards:
        link = re.search(r'<a href="(/didattica/offerta-formativa/corsi-di-studio/[^"#?]+)"[^>]*>(.*?)</a>', chunk, re.S)
        if not link:
            continue
        text = _card_text(chunk)

        def field(label):
            m = re.search(re.escape(label) + r":\s*\|\s*([^|]+)", text)
            return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""

        out.append(
            {
                "nome": re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", "", link.group(2)))).strip(),
                "url": UNITO_HOST + link.group(1),
                "classe_raw": field("Classe di laurea"),
                "tipo_raw": field("Tipo"),
                "accesso": field("Accesso"),
                "lingua": field("Lingua"),
                "sede": field("Sede"),
            }
        )
    return out


def parse_mur_csv(raw):
    """Rows for the two Turin atenei in the latest year of the national file."""
    rows = list(csv.DictReader(io.StringIO(raw.decode("cp1252")), delimiter=";"))
    years = [int(r["ANNO"]) for r in rows if r["ANNO"].isdigit()]
    year = max(years)
    out = []
    for r in rows:
        if r["ANNO"] != str(year) or r["Ateneo"] not in MUR_ATENEI:
            continue
        code = class_code(r["Classe"])
        tipo = class_type(code, r["TipoCorso"])
        out.append(
            {
                "ateneo": MUR_ATENEI[r["Ateneo"]],
                "anno": year,
                "tipo": tipo,
                "classe": code or r["Classe"],
                "nome": r["Corso"].strip(),
                "sede": r["SedeCorso_Comune"].strip(),
                "accesso": r["ACCESSO"].strip(),
                "lingua": r["LINGUA"].strip(),
            }
        )
    return out, year


# --------------------------------------------------------------------------- fetch command

def cmd_fetch(args):
    CACHE.mkdir(exist_ok=True)
    summary = {}

    landing, _ = fetch(POLITO_LANDING, CACHE / "polito" / "landing.html", refresh=args.refresh)
    m = re.search(r'href="([^"]+\.csv[^"]*)"', landing.decode("utf-8", "replace"))
    if not m:
        sys.exit("PoliTo open-data page no longer links a CSV: check the page by hand")
    csv_url = m.group(1)
    csv_url = csv_url if csv_url.startswith("http") else "https://www.polito.it" + csv_url
    _, meta = fetch(csv_url, CACHE / "polito" / "corsi-di-studio.csv", refresh=args.refresh)
    summary["polito_csv"] = {"url": csv_url, "last_modified": meta.get("last_modified")}
    _, meta = fetch(POLITO_LIST, CACHE / "polito" / "corsi-di-laurea.html", refresh=args.refresh)
    summary["polito_list"] = {"url": POLITO_LIST, "retrieved": meta.get("retrieved")}

    pages = 0
    seen = set()
    for n in range(UNITO_MAX_PAGES):
        url = UNITO_INDEX if n == 0 else f"{UNITO_INDEX}?page={n}"
        dest = CACHE / "unito" / f"page-{n}.html"
        cached = dest.exists() and not args.refresh
        body, _ = fetch(url, dest, refresh=args.refresh, delay=0 if cached or n == 0 else UNITO_CRAWL_DELAY)
        cards = parse_unito_page(body.decode("utf-8", "replace"))
        new = {c["url"] for c in cards} - seen
        if not cards or not new:
            break
        seen |= new
        pages += 1
        print(f"unito page {n}: {len(cards)} courses", file=sys.stderr)
    summary["unito"] = {"url": UNITO_INDEX, "pages": pages, "courses": len(seen)}

    _, meta = fetch(MUR_CSV, CACHE / "mur" / "offerta-formativa.csv", max_age_hours=24 * 7, refresh=args.refresh)
    summary["mur"] = {"url": MUR_CSV, "last_modified": meta.get("last_modified"), "bytes": meta.get("bytes")}

    (CACHE / "fetch-summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


# --------------------------------------------------------------------------- normalise command

def _cached(path):
    if not path.exists():
        sys.exit(f"missing {path.relative_to(ROOT)}: run `fetch` first")
    return path.read_bytes()


def load_overrides():
    return json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {"urls": {}}


def merge_rows(rows):
    """Collapse rows with the same (ateneo, classe, nome_norm): campuses, languages and variants merge."""
    merged = {}
    for r in rows:
        name = clean_name(r["nome"])
        key = f"{r['ateneo']}|{r['classe']}|{fold(name)}"
        cur = merged.setdefault(key, {**r, "nome": name, "key": key, "nome_norm": fold(name), "sedi": [], "lingue": [], "varianti": 0})
        cur["varianti"] += 1
        for field, plural in (("sede", "sedi"), ("lingua", "lingue")):
            v = r.get(field)
            if v and v not in cur[plural]:
                cur[plural].append(v)
        if r.get("url") and not cur.get("url"):
            cur["url"] = r["url"]
        if r.get("alt_nome") and not cur.get("alt_nome"):
            cur["alt_nome"] = r["alt_nome"]
    for cur in merged.values():
        cur.pop("sede", None)
        cur.pop("lingua", None)
        cur["nome_display"] = sentence_case(cur["nome"])
    return merged


def cmd_normalise(_args):
    OUT.mkdir(exist_ok=True)
    overrides = load_overrides()
    rows = []

    polito, polito_year = parse_polito_csv(_cached(CACHE / "polito" / "corsi-di-studio.csv"))
    links = polito_course_links(_cached(CACHE / "polito" / "corsi-di-laurea.html").decode("utf-8", "replace"))
    for r in polito:
        r.update(ateneo="polito", source="polito-open-data", url=match_polito_slug([r["nome"], r["alt_nome"]], links))
        rows.append(r)

    unito_dir = CACHE / "unito"
    unito_year = None
    for page in sorted(unito_dir.glob("page-*.html"), key=lambda p: int(p.stem.split("-")[1])):
        for c in parse_unito_page(page.read_text(encoding="utf-8", errors="replace")):
            code = class_code(c["classe_raw"])
            tipo = class_type(code, c["tipo_raw"])
            if code is None or tipo not in GAME_TYPES:
                continue
            rows.append(
                {
                    "ateneo": "unito",
                    "tipo": tipo,
                    "classe": code,
                    "nome": c["nome"],
                    "alt_nome": None,
                    "sede": c["sede"],
                    "lingua": c["lingua"],
                    "accesso": c["accesso"],
                    "url": c["url"],
                    "source": "unito-site",
                }
            )

    merged = merge_rows(rows)

    mur_rows, mur_year = parse_mur_csv(_cached(CACHE / "mur" / "offerta-formativa.csv"))
    mur_keys = {
        f"{r['ateneo']}|{r['classe']}|{fold(clean_name(split_parenthetical(r['nome'])[0]))}"
        for r in mur_rows
        if r["tipo"] in GAME_TYPES
    }
    for key, row in merged.items():
        row["in_mur"] = key in mur_keys
        override = overrides.get("urls", {}).get(key)
        if override:
            row["url"] = override
    mur_only = sorted(k for k in mur_keys if k not in merged)

    fetch_summary = json.loads((CACHE / "fetch-summary.json").read_text()) if (CACHE / "fetch-summary.json").exists() else {}
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": "first-cycle and single-cycle degrees (L, LMCU)",
        "sources": {
            "polito": {"anno_accademico": polito_year, "origin": "polito.it open data (ACCETTA_IMMA = S)"},
            "unito": {"origin": "unito.it course listing (current offering)"},
            "mur": {"anno": mur_year, "origin": "dati-ustat.mur.gov.it Offerta formativa (cross-check only)"},
            "fetch": fetch_summary,
        },
        "counts": {
            "polito": sum(1 for r in merged.values() if r["ateneo"] == "polito"),
            "unito": sum(1 for r in merged.values() if r["ateneo"] == "unito"),
            "mur_rows_not_in_primary_sources": len(mur_only),
        },
        "mur_only": mur_only,
        "courses": sorted(merged.values(), key=lambda r: (r["ateneo"], r["nome_norm"], r["classe"])),
    }
    (OUT / "courses.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"counts": result["counts"], "sources": {k: v for k, v in result["sources"].items() if k != "fetch"}}, indent=2))


# --------------------------------------------------------------------------- diff / suggest

def load_courses():
    path = OUT / "courses.json"
    if not path.exists():
        sys.exit("missing catalog/out/courses.json: run `normalise` first")
    return json.loads(path.read_text())


def load_mapping():
    return json.loads(MAPPING.read_text()) if MAPPING.exists() else {}


def load_cards():
    return json.loads(SITE_DATA.read_text())


def diff_report(courses, mapping, cards):
    """Pure function: returns a dict with the sections of the report (testable without files)."""
    by_key = {c["key"]: c for c in courses}
    card_ids = {c["id"] for c in cards}
    mapped_keys = {k for keys in mapping.values() for k in keys}

    unmapped_cards = [c for c in cards if c["id"] not in mapping]
    stale_mapping = {cid: keys for cid, keys in mapping.items() if cid not in card_ids}
    gone = {}  # card -> keys that no longer exist
    for cid, keys in mapping.items():
        if cid not in card_ids:
            continue
        missing = [k for k in keys if k not in by_key]
        if missing:
            gone[cid] = missing
    fully_gone = [cid for cid in gone if all(k not in by_key for k in mapping[cid])]
    new_rows = [c for c in courses if c["key"] not in mapped_keys]

    renamed = []
    for card in cards:
        keys = [k for k in mapping.get(card["id"], []) if k in by_key]
        if not keys:
            continue
        names = {fold(by_key[k]["nome"]) for k in keys} | {fold(by_key[k]["alt_nome"] or "") for k in keys}
        if fold(card["name"]["it"]) not in names and fold(card["name"]["en"]) not in names:
            renamed.append({"id": card["id"], "card_it": card["name"]["it"], "catalogue": [by_key[k]["nome_display"] for k in keys]})

    universities_changed = []
    for card in cards:
        keys = [k for k in mapping.get(card["id"], []) if k in by_key]
        if not keys:
            continue
        current = sorted({by_key[k]["ateneo"] for k in keys})
        if sorted(card.get("university", [])) != current:
            universities_changed.append({"id": card["id"], "card": card.get("university"), "catalogue": current})

    return {
        "unmapped_cards": unmapped_cards,
        "stale_mapping": stale_mapping,
        "partly_gone": gone,
        "fully_gone": fully_gone,
        "new_rows": new_rows,
        "renamed": renamed,
        "universities_changed": universities_changed,
    }


def render_report(rep, courses_meta, cards):
    card_by_id = {c["id"]: c for c in cards}
    lines = [f"# Catalogue diff ({courses_meta['generated_at']})", ""]
    lines += [f"Polito {courses_meta['counts']['polito']} programmes (a.a. {courses_meta['sources']['polito']['anno_accademico']}), "
              f"UniTo {courses_meta['counts']['unito']}.", ""]

    def section(title, items, fmt):
        lines.append(f"## {title} ({len(items)})")
        lines.extend(fmt(i) for i in items) if items else lines.append("none")
        lines.append("")

    section("Cards with no mapping", rep["unmapped_cards"], lambda c: f"- {c['id']} {c['name']['it']}")
    section("Possibly discontinued (no mapped programme is in the catalogue any more)", rep["fully_gone"],
            lambda cid: f"- {cid} {card_by_id[cid]['name']['it']}: {', '.join(rep['partly_gone'][cid])}")
    section("Mapped programme missing from the catalogue (card still has another source)",
            [c for c in rep["partly_gone"] if c not in rep["fully_gone"]],
            lambda cid: f"- {cid} {card_by_id[cid]['name']['it']}: {', '.join(rep['partly_gone'][cid])}")
    section("New programmes (in the catalogue, on no card)", rep["new_rows"],
            lambda r: f"- {r['key']} | {r['nome_display']} ({r['tipo']}, {', '.join(r['lingue']) or '?'})")
    section("Card name differs from the catalogue name", rep["renamed"],
            lambda r: f"- {r['id']} \"{r['card_it']}\" vs {r['catalogue']}")
    section("Card `university` differs from the catalogue", rep["universities_changed"],
            lambda r: f"- {r['id']} card={r['card']} catalogue={r['catalogue']}")
    section("Mapping entries for cards that no longer exist", list(rep["stale_mapping"]), lambda cid: f"- {cid}")
    return "\n".join(lines) + "\n"


def cmd_diff(_args):
    meta = load_courses()
    cards = load_cards()
    rep = diff_report(meta["courses"], load_mapping(), cards)
    OUT.mkdir(exist_ok=True)
    text = render_report(rep, meta, cards)
    (OUT / "diff.md").write_text(text)
    print(text)


def cmd_suggest(_args):
    """Print mapping.json candidates for unmapped cards: closest catalogue names by similarity."""
    meta = load_courses()
    cards = load_cards()
    mapping = load_mapping()
    pool = [(c["key"], {fold(c["nome"]), fold(c["alt_nome"] or "")} - {""}) for c in meta["courses"]]
    suggestions = {}
    for card in cards:
        if card["id"] in mapping:
            continue
        targets = {fold(card["name"]["it"]), fold(card["name"]["en"])}
        scored = []
        for key, names in pool:
            best = max(difflib.SequenceMatcher(None, t, n).ratio() for t in targets for n in names)
            scored.append((best, key))
        scored.sort(reverse=True)
        hits = [k for s, k in scored if s >= 0.97] or [k for s, k in scored[:1] if s >= 0.75]
        suggestions[card["id"]] = hits
    print(json.dumps(suggestions, indent=2, ensure_ascii=False))


def enrich_cards(cards, courses, mapping):
    """Pure function. Returns (new_cards, changes). Sets `university` (sorted) and `url` ({ateneo: page}) from the
    catalogue rows a card is mapped to. A card with no mapped row in the catalogue is left exactly as it is, so a
    source that failed to load or a programme that disappeared never wipes existing data."""
    by_key = {c["key"]: c for c in courses}
    out, changes = [], []
    for card in cards:
        rows = [by_key[k] for k in mapping.get(card["id"], []) if k in by_key]
        if not rows:
            out.append(card)
            continue
        university = sorted({r["ateneo"] for r in rows})
        url = {}
        for r in rows:
            if r.get("url") and r["ateneo"] not in url:
                url[r["ateneo"]] = r["url"]
        new = {}
        for k, v in card.items():
            if k in ("university", "url"):
                continue
            new[k] = v
            if k == "tags":
                new["university"] = university
                if url:
                    new["url"] = dict(sorted(url.items()))
        if "university" not in new:  # card without a `tags` key
            new["university"] = university
            if url:
                new["url"] = dict(sorted(url.items()))
        if new != card:
            changes.append(card["id"])
        out.append(new)
    return out, changes


def cmd_enrich(args):
    meta = load_courses()
    cards = load_cards()
    new_cards, changes = enrich_cards(cards, meta["courses"], load_mapping())
    print(f"{len(changes)} cards would change ({len(cards)} total)")
    if args.write:
        SITE_DATA.write_text(json.dumps(new_cards, indent=2, ensure_ascii=False))
        print(f"wrote {SITE_DATA.relative_to(ROOT.parent)}")
    else:
        print("dry run: pass --write to save")


def cmd_all(args):
    cmd_fetch(args)
    cmd_normalise(args)
    cmd_diff(args)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("command", choices=["fetch", "normalise", "diff", "suggest", "enrich", "all"])
    p.add_argument("--refresh", action="store_true", help="ignore the cache and download again")
    p.add_argument("--write", action="store_true", help="enrich: save the result to src/data/degrees.json")
    args = p.parse_args(argv)
    commands = {"fetch": cmd_fetch, "normalise": cmd_normalise, "diff": cmd_diff, "suggest": cmd_suggest,
                "enrich": cmd_enrich, "all": cmd_all}
    commands[args.command](args)


if __name__ == "__main__":
    main()
