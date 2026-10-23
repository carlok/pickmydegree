# Refresh 2026 (academic year 2026/27)

Run on 2026-10-23 with `catalog/catalog.py all`, then `enrich --write`.

## Sources used

| Source | Result |
|---|---|
| PoliTo open-data CSV (`ACCETTA_IMMA = S`, a.a. 2026) | 25 first-cycle programmes after merging English variants and orientations |
| PoliTo course pages (`/didattica/corsi-di-laurea/<slug>`) | 24 pages found; every PoliTo card got a link |
| UniTo course listing (16 pages, page text says "anno accademico 2026-2027") | 77 first-cycle and single-cycle programmes (186 courses in total, the rest are master's degrees) |
| MUR Offerta formativa (file dated 2026-09-01, latest year 2025) | cross-check only; 5 rows are not in the primary sources (see below) |

Both universities were refreshed from 2026/27 data, so `welcome.data_academic_year` now says 2026-27 (was 2025-26).

## What changed in `src/data/degrees.json`

- **100 cards gained `university` and `url`** (76 UniTo, 24 PoliTo): 99 existing cards plus the new one, taken from the catalogue through `catalog/mapping.json`. Of the 102 existing cards, 99 map to a 2026 programme (all exact name matches except `deg-016`, which the site calls "Discipline delle arti, della musica, dello spettacolo e dei media digitali" and UniTo calls "DAMS (...)"), 1 maps to a last-known key that is gone (`deg-033`), 2 are unmapped.
- **1 new card: `deg-103` Economics and Finance with Data Science** (UniTo, L-33, taught in English, programmed access). Description and tags written from the course page.
- Italian names are in sentence case and the English ones have lower-case conjunctions (done earlier, with the UI work).
- No card was deleted and no description was rewritten.

## What stayed old, and why

- **`deg-033` Infermieristica pediatrica**: in MUR 2025 (UniTo, L/SNT1) but not in the 2026/27 UniTo listing, which only has a master's degree on neonatal and paediatric nursing. Probably no longer offered as a first-cycle degree, or listed under another name. Left as is, see `TODO-possibly-discontinued.md`.
- **`deg-017` Design sostenibile per il sistema alimentare** and **`deg-028` Food Tech for Ecological Transition**: in neither the PoliTo nor the UniTo listing. The Food Tech description says it is offered by the Università di Pollenzo with PoliTo. They have no `university` or `url`. Left as is.
- Descriptions of the other 100 cards were not re-checked against the 2026 course pages; the catalogue gives names, classes and links, not text.

## Cross-check differences (MUR 2025 vs the 2026 sources)

- `unito|L-32|scienze e tecnologie per la montagna` in MUR vs L-25 on the UniTo site: the class changed or one source is wrong; the site value is used.
- `unito|L-P02|tecnologie dei sistemi ristorativi` is in MUR only: not on a card, not in the 2026/27 UniTo listing.
- `polito|L-9|ingegneriachimica e alimentare`: MUR typo for Ingegneria chimica e alimentare (matched by the PoliTo source).
- `unito|L-3|dams`: MUR short name for the DAMS degree.

## Known gaps

- PoliTo pages: only the bachelor listing was used; the two "Pollenzo" programmes are not on it.
- The PoliTo CSV lists orientations and campuses as separate rows; they are merged into one programme (`varianti` in `courses.json`).
- UniTo programmes with several campuses appear once (`sedi` lists them).
