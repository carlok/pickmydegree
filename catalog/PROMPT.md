# Brief: refresh the PickMyDegree degree catalogue

Use this when asked to "update the degree list" (normally once a year, from September, when the new academic year's offering is published). Read `catalog/README.md` first for the commands.

## Goal

Keep `src/data/degrees.json` (the cards the game shows) in line with what Politecnico di Torino and Università di Torino actually offer, without losing hand-written content. First-cycle (`L`) and single-cycle (`LMCU`) degrees only; the app is for final-year high-school students.

## Procedure

1. `python3 -I catalog/catalog.py all`. Check the printed counts against the previous refresh (`catalog/out/REFRESH-*.md`): a large swing means a parser broke, not that the universities changed.
2. Read `catalog/out/diff.md`. Sections: cards with no mapping, possibly discontinued, new programmes, renamed, university mismatch, stale mapping.
3. Decide per item:
   - **New programme**: add a card only if you can write category (one of the existing seven), both names, a description in both languages and 3 tags per language from the catalogue entry. Otherwise record it in `catalog/out/TODO-new-programmes.md` for the description pipeline. Ids continue the `deg-NNN` sequence; do not reuse ids.
   - **Possibly discontinued**: never delete automatically. Record in `catalog/out/TODO-possibly-discontinued.md` and let the maintainer decide. A programme missing from one source may just be named differently: check `mapping.json` and `overrides.json` first.
   - **Rename**: fix the card `name`, keeping Italian names in sentence case. **University / link changes**: `python3 -I catalog/catalog.py enrich --write` sets `university` and `url` from the mapping.
   - **Anything that does not fit a card** (a programme split in two, two merged): ask.
4. Update `mapping.json` for every card you touch. Run `diff` again; the sections you handled should be empty.
5. Update `welcome.data_academic_year` in `src/i18n/en.json` and `it.json` only if both universities were refreshed from data for the new year. If only one was, say so in the text or leave the old year. If a source cannot be reached or parsed, keep the old data for that university and report it.
6. Run the site tests (`npm test` or the Docker pattern in the repo README): `tests/unit/degreesData.test.js` checks the card structure.
7. Write `catalog/out/REFRESH-<year>.md`: date, what changed, what stayed old and why.

## Rules

- Only `enrich --write` edits `degrees.json` by script (the `university` and `url` fields). Names, descriptions, tags, new and removed cards are decided by a person; the diff is a report.
- Be polite to the sources: keep the UniTo 5 s crawl delay; do not run `fetch` in a loop; the cache exists for a reason.
- Names: match on the normalised key (`fold()` in `catalog.py`), not on raw strings. MUR text has typos and mixed case.
- The catalogue says what is offered, not what is good: descriptions are written from the university's own pages, in neutral terms.
- Do not invent URLs. A card without a page link is fine.

## Sources and their traps

- PoliTo CSV: columns `A_ACC;DESCRIZIONE;NOME_CDL;ACCETTA_IMMA;A_ACC_NASCITA;COD_CLASSE;DESC_NORMA`, cp1252, `;`. Several rows per programme (orientations, English variant written as `NAME (OTHER NAME)`). Old 509/99 classes (`10`, `4/S`) are not first-cycle offerings: skipped.
- UniTo listing: 12 cards per page, `?page=N`, link slug + class + type + access + language + campus on each card. A programme on two campuses is two cards.
- MUR CSV: `Ateneo` is `Torino` (UniTo) or `Torino Politecnico` (PoliTo); `ANNO` 2025 means a.a. 2025/26; no URLs, no course ids.
- Not available: UniTo open data (the XML stub is empty), Universitaly (no export found), SUA-CdS and ANVUR (not checked).

## Future: a national list

Same MUR file without the ateneo filter. The blocker is design, not data: the game merges overlapping programmes into generic cards, so a national list needs a decision first (one card per class `L-xx`, or per ateneo and programme). URLs and descriptions would need a per-university step like the two scrapers here.
