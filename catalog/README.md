# catalog: keeping the degree list current

A separate subproject that produces the data behind `src/data/degrees.json`. It is **not** part of the website: it is excluded from the Docker image and the Vite build, and nothing in `src/` imports it. Scope for now: Politecnico di Torino (PoliTo) and Università di Torino (UniTo), first-cycle (`L`) and single-cycle (`LMCU`) degrees.

## Run it

Python 3.10+, standard library only. From the repository root:

```bash
python3 -I catalog/catalog.py fetch       # download the sources into catalog/.cache/ (about 2 minutes: UniTo asks for a 5 s crawl delay)
python3 -I catalog/catalog.py normalise   # merge them into catalog/out/courses.json
python3 -I catalog/catalog.py diff        # compare with src/data/degrees.json, writes catalog/out/diff.md
python3 -I catalog/catalog.py all         # all three
python3 -I catalog/catalog.py enrich      # dry run: how many cards would get `university` / `url` from the catalogue
python3 -I catalog/catalog.py enrich --write   # save them into src/data/degrees.json (only those two fields)
python3 -I catalog/catalog.py suggest     # mapping.json candidates for cards that have none
python3 -m unittest discover -s catalog/tests
```

`--refresh` ignores the cache. Downloaded files stay in `catalog/.cache/` (gitignored) and are treated as data only.

## What it reads

| Source | What for | Notes |
|---|---|---|
| `polito.it/open-data/corsi-di-studio` (CSV, cp1252) | PoliTo programmes for the current academic year (rows with `ACCETTA_IMMA = S`) | The CSV link contains a folder that changes (`2024-12`), so the script finds it on the landing page |
| `polito.it/didattica/corsi-di-laurea` | PoliTo course page URLs | Slugs are matched to programme names; PoliTo truncates long slugs |
| `unito.it/didattica/offerta-formativa/corsi-di-studio` (paginated) | UniTo programmes, classes and URLs for the current offering | No open data exists; `robots.txt` has `Crawl-delay: 5` and allows these pages |
| MUR Ufficio di Statistica, *Offerta formativa* (CSV, cp1252) | Cross-check (`in_mur` flag) | National, all atenei, latest year is older than the university sites; no URLs |

MUR data is public domain (IODL 2.0 at dataset level): attribute "MUR, Ufficio di Statistica". PoliTo's open-data page states no licence; UniTo pages are scraped for factual course names and links only.

## Files

- `catalog.py`: the tool.
- `mapping.json`: card id -> list of catalogue keys (`ateneo|class|normalised name`). Edited by hand, reviewed in `diff.md`.
- `overrides.json`: manual `{"urls": {"<key>": "https://..."}}` for programmes whose page can't be matched.
- `out/courses.json`, `out/diff.md`: generated. `out/REFRESH-2026.md` records what the last refresh changed.
- `PROMPT.md`: the standing brief for a future (human or Claude) refresh.
- `tests/`: fixture-based tests, no network.

## From a diff to new cards

`enrich --write` is the only command that touches `degrees.json`, and only the `university` and `url` fields of cards that map to a programme in the catalogue (a card whose programme vanished keeps what it has). For a new programme, write the card (category, both names, description and 3+3 tags) and add its catalogue key to `mapping.json`. The LLM pipeline in `scripts/degree-descriptions/` (needs Serper and LLM keys) can draft descriptions for new cards.
