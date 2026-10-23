"""Fixture-based tests for catalog/catalog.py (no network). Run: python3 -m unittest discover -s catalog/tests"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import catalog as c  # noqa: E402


class TextHelpers(unittest.TestCase):
    def test_fold_drops_accents_apostrophes_and_punctuation(self):
        self.assertEqual(c.fold("INGEGNERIA DELL’AUTOVEICOLO"), "ingegneria dellautoveicolo")
        self.assertEqual(c.fold("Scienze dell'Antichità"), "scienze dellantichita")
        self.assertEqual(c.fold("Business & Management"), "business management")

    def test_fold_matches_across_case_and_apostrophe_style(self):
        self.assertEqual(c.fold("Ingegneria dell'autoveicolo"), c.fold("INGEGNERIA DELL`AUTOVEICOLO"))

    def test_split_parenthetical(self):
        self.assertEqual(c.split_parenthetical("INGEGNERIA INFORMATICA (COMPUTER ENGINEERING)"),
                         ("INGEGNERIA INFORMATICA", "COMPUTER ENGINEERING"))
        self.assertEqual(c.split_parenthetical("ARCHITETTURA"), ("ARCHITETTURA", None))

    def test_class_code(self):
        self.assertEqual(c.class_code("L-18 R - Scienze dell'economia"), "L-18")
        self.assertEqual(c.class_code("L-8 R "), "L-8")
        self.assertEqual(c.class_code("L-P03"), "L-P03")
        self.assertEqual(c.class_code("LM-77 R - Scienze economico-aziendali"), "LM-77")
        self.assertEqual(c.class_code("LMR/02"), "LMR/02")
        self.assertEqual(c.class_code("LMG/01 - Giurisprudenza"), "LMG/01")
        self.assertEqual(c.class_code("L/SNT1 - Professioni sanitarie"), "L/SNT1")
        self.assertEqual(c.class_code("L/DS"), "L/DS")
        self.assertEqual(c.class_code("L-Sc.Mat."), "L-Sc.Mat")
        self.assertIsNone(c.class_code("10"))       # old 509/99 code
        self.assertIsNone(c.class_code("4/S"))

    def test_class_type(self):
        self.assertEqual(c.class_type("L-8", "Corso di laurea di 1°livello"), "L")
        self.assertEqual(c.class_type("LM-41", "Laurea Magistrale Ciclo Unico 6 anni"), "LMCU")
        self.assertEqual(c.class_type("LMR/02", ""), "LMCU")
        self.assertEqual(c.class_type("LMG/01", "Laurea Magistrale Ciclo Unico 5 anni"), "LMCU")
        self.assertEqual(c.class_type("L/SNT1", "Laurea"), "L")
        self.assertEqual(c.class_type("LM/SNT1", "Laurea Magistrale"), "LM")
        self.assertEqual(c.class_type("LM-77", "Laurea Magistrale"), "LM")

    def test_clean_name_drops_campus_replicas_and_qualifications(self):
        self.assertEqual(c.clean_name("ECONOMIA AZIENDALE REPLICA BIELLA"), "ECONOMIA AZIENDALE")
        self.assertEqual(c.clean_name("INFERMIERISTICA ABILITANTE ALLA PROFESSIONE SANITARIA DI INFERMIERE REPLICA CUNEO"), "INFERMIERISTICA")
        self.assertEqual(c.clean_name("DIETISTICA (ABILITANTE ALLA PROFESSIONE SANITARIA DI DIETISTA)"), "DIETISTICA")
        self.assertEqual(c.clean_name("OSTETRICIA (ABILITANTE ALLA PROFESSIONE SANITARIA DI OSTETRICA O"), "OSTETRICIA")
        self.assertEqual(c.clean_name("Fisica"), "Fisica")

    def test_sentence_case(self):
        self.assertEqual(c.sentence_case("INGEGNERIA DELLA PRODUZIONE  INDUSTRIALE"), "Ingegneria della produzione industriale")


POLITO_CSV = (
    "A_ACC;DESCRIZIONE;NOME_CDL;ACCETTA_IMMA;A_ACC_NASCITA;COD_CLASSE;DESC_NORMA\r\n"
    "2025;Corso di laurea di 1°livello;INGEGNERIA FISICA;S;2004;L-8 R;DM 270/04\r\n"
    "2026;Corso di laurea di 1°livello;INGEGNERIA FISICA;S;2005;L-8 R;DM 270/04\r\n"
    "2026;Corso di laurea di 1°livello;INGEGNERIA INFORMATICA;S;2005;L-8 R;DM 270/04\r\n"
    "2026;Corso di laurea di 1°livello;INGEGNERIA INFORMATICA (COMPUTER ENGINEERING);S;2005;L-8 R;DM 270/04\r\n"
    "2026;Corso di laurea di 1°livello;INGEGNERIA MECCANICA;N;2005;10;DM 509/99\r\n"
    "2026;Corso di laurea magistrale;INGEGNERIA INFORMATICA;S;2005;LM-32;DM 270/04\r\n"
    "2026;Corso di laurea di 1°livello;INGEGNERIA DELL’AUTOVEICOLO;S;2005;L-9 R;DM 270/04\r\n"
).encode("cp1252")


class PolitoParsing(unittest.TestCase):
    def test_keeps_latest_year_open_first_cycle_only(self):
        rows, year = c.parse_polito_csv(POLITO_CSV)
        self.assertEqual(year, 2026)
        names = sorted(r["nome"] for r in rows)
        self.assertEqual(names, ["INGEGNERIA DELL’AUTOVEICOLO", "INGEGNERIA FISICA", "INGEGNERIA INFORMATICA", "INGEGNERIA INFORMATICA"])
        self.assertTrue(all(r["tipo"] == "L" for r in rows))

    def test_english_variants_merge_into_one_programme(self):
        rows, _ = c.parse_polito_csv(POLITO_CSV)
        for r in rows:
            r.update(ateneo="polito", source="polito-open-data", url=None)
        merged = c.merge_rows(rows)
        informatica = [m for m in merged.values() if m["nome_norm"] == "ingegneria informatica"]
        self.assertEqual(len(informatica), 1)
        self.assertEqual(informatica[0]["varianti"], 2)
        self.assertEqual(informatica[0]["key"], "polito|L-8|ingegneria informatica")

    def test_course_links_and_slug_matching_including_truncated_slugs(self):
        page = (
            '<a href="/didattica/corsi-di-laurea/ingegneria-dell-autoveicolo">x</a>'
            '<a href="https://www.polito.it/didattica/corsi-di-laurea/pianificazione-territoriale-urbanistica-e-paesaggistico">y</a>'
            '<a href="/didattica/corsi-di-laurea-magistrale/ingegneria-informatica">not a bachelor page</a>'
        )
        links = c.polito_course_links(page)
        self.assertEqual(set(links), {"ingegneria-dell-autoveicolo", "pianificazione-territoriale-urbanistica-e-paesaggistico"})
        self.assertEqual(c.match_polito_slug(["INGEGNERIA DELL'AUTOVEICOLO", None], links),
                         "https://www.polito.it/didattica/corsi-di-laurea/ingegneria-dell-autoveicolo")
        self.assertEqual(c.match_polito_slug(["PIANIFICAZIONE TERRITORIALE, URBANISTICA E PAESAGGISTICO-AMBIENTALE"], links),
                         "https://www.polito.it/didattica/corsi-di-laurea/pianificazione-territoriale-urbanistica-e-paesaggistico")
        self.assertIsNone(c.match_polito_slug(["FISICA"], links))


UNITO_PAGE = """
<div class="grid"><div class="card border-0 box-shadow card-body  p-0 pb-4 col-xxl-4"><img src="x.png">
<div class="views-field views-field-field-name"><div class="field-content"><a href="/didattica/offerta-formativa/corsi-di-studio/amministrazione-aziendale" hreflang="it">AMMINISTRAZIONE AZIENDALE</a></div></div>
<div class="view"><div><strong class="views-label">Classe di laurea: </strong><span>L-18 R - Scienze dell&#039;economia e della gestione aziendale</span></div>
<div><strong class="views-label">Tipo: </strong><span>Laurea</span></div>
<div><strong class="views-label">Accesso: </strong><span>Libero</span></div>
<div><strong class="views-label">Lingua: </strong><span>Inglese Italiano</span></div><strong>Sede: </strong><span>TORINO</span></div></div>
<div class="card border-0 box-shadow card-body  p-0 pb-4 col-xxl-4">
<div class="views-field"><div class="field-content"><a href="/didattica/offerta-formativa/corsi-di-studio/amministrazione-e-controllo-aziendale">AMMINISTRAZIONE E CONTROLLO AZIENDALE</a></div></div>
<div><strong>Classe di laurea: </strong><span>LM-77 R - Scienze economico-aziendali</span></div>
<div><strong>Tipo: </strong><span>Laurea Magistrale</span></div><div><strong>Accesso: </strong><span>Libero</span></div>
<div><strong>Lingua: </strong><span>Italiano</span></div><strong>Sede: </strong><span>TORINO</span></div></div>
"""


class UnitoParsing(unittest.TestCase):
    def test_parses_cards(self):
        cards = c.parse_unito_page(UNITO_PAGE)
        self.assertEqual(len(cards), 2)
        first = cards[0]
        self.assertEqual(first["nome"], "AMMINISTRAZIONE AZIENDALE")
        self.assertEqual(first["url"], "https://www.unito.it/didattica/offerta-formativa/corsi-di-studio/amministrazione-aziendale")
        self.assertEqual(c.class_code(first["classe_raw"]), "L-18")
        self.assertEqual(first["tipo_raw"], "Laurea")
        self.assertEqual(first["accesso"], "Libero")
        self.assertEqual(first["lingua"], "Inglese Italiano")
        self.assertEqual(first["sede"], "TORINO")
        self.assertEqual(c.class_type(c.class_code(cards[1]["classe_raw"]), cards[1]["tipo_raw"]), "LM")

    def test_page_without_cards_is_empty(self):
        self.assertEqual(c.parse_unito_page("<html><body>no cards</body></html>"), [])


MUR_CSV_TEXT = (
    "ANNO;Ateneo;Area;GruppoDisciplinare;TipoCorso;Classe;NomeClasse;Corso;SedeCorso_Provincia;SedeCorso_Comune;ACCESSO;DIDATTICA;LINGUA\r\n"
    "2024;Torino;X;Y;Laurea;L-31;Scienze e tecnologie informatiche;INFORMATICA;Torino;Torino;accesso libero;Convenzionale;Italiano\r\n"
    "2025;Torino;X;Y;Laurea;L-31;Scienze e tecnologie informatiche;INFORMATICA;Torino;Torino;accesso libero;Convenzionale;Italiano\r\n"
    "2025;Torino Politecnico;X;Y;Laurea;L-8;Ingegneria;INGEGNERIA FISICA;Torino;Torino;accesso locale;Convenzionale;Italiano\r\n"
    "2025;Milano;X;Y;Laurea;L-31;Scienze;INFORMATICA;Milano;Milano;accesso libero;Convenzionale;Italiano\r\n"
    "2025;Torino;X;Y;Laurea Magistrale Ciclo Unico;LMR/02;Conservazione;CONSERVAZIONE E RESTAURO;Torino;Venaria;accesso locale;Convenzionale;Italiano\r\n"
).encode("cp1252")


class MurParsing(unittest.TestCase):
    def test_latest_year_and_turin_only(self):
        rows, year = c.parse_mur_csv(MUR_CSV_TEXT)
        self.assertEqual(year, 2025)
        self.assertEqual(sorted((r["ateneo"], r["nome"]) for r in rows),
                         [("polito", "INGEGNERIA FISICA"), ("unito", "CONSERVAZIONE E RESTAURO"), ("unito", "INFORMATICA")])
        self.assertEqual({r["nome"]: r["tipo"] for r in rows}["CONSERVAZIONE E RESTAURO"], "LMCU")


COURSES = [
    {"key": "unito|L-31|informatica", "ateneo": "unito", "nome": "INFORMATICA", "alt_nome": None, "nome_display": "Informatica", "tipo": "L", "lingue": ["Italiano"]},
    {"key": "polito|L-8|ingegneria fisica", "ateneo": "polito", "nome": "INGEGNERIA FISICA", "alt_nome": None, "nome_display": "Ingegneria fisica", "tipo": "L", "lingue": []},
    {"key": "unito|L-5|filosofia", "ateneo": "unito", "nome": "FILOSOFIA", "alt_nome": None, "nome_display": "Filosofia", "tipo": "L", "lingue": []},
]
CARDS = [
    {"id": "deg-1", "name": {"it": "Informatica", "en": "Computer Science"}, "university": ["unito"]},
    {"id": "deg-2", "name": {"it": "Ingegneria fisica", "en": "Engineering Physics"}, "university": ["unito"]},
    {"id": "deg-3", "name": {"it": "Storia", "en": "History"}},
    {"id": "deg-4", "name": {"it": "Greco", "en": "Greek"}},
]


class Diff(unittest.TestCase):
    def setUp(self):
        self.mapping = {
            "deg-1": ["unito|L-31|informatica"],
            "deg-2": ["polito|L-8|ingegneria fisica"],
            "deg-4": ["unito|L-1|greco"],
            "deg-9": ["unito|L-9|vecchio"],
        }
        self.rep = c.diff_report(COURSES, self.mapping, CARDS)

    def test_unmapped_cards(self):
        self.assertEqual([x["id"] for x in self.rep["unmapped_cards"]], ["deg-3"])

    def test_programme_gone_from_catalogue_is_flagged_not_deleted(self):
        self.assertEqual(self.rep["fully_gone"], ["deg-4"])

    def test_new_programmes_are_catalogue_rows_on_no_card(self):
        self.assertEqual([x["key"] for x in self.rep["new_rows"]], ["unito|L-5|filosofia"])

    def test_stale_mapping_entries(self):
        self.assertEqual(list(self.rep["stale_mapping"]), ["deg-9"])

    def test_university_mismatch(self):
        self.assertEqual(self.rep["universities_changed"], [{"id": "deg-2", "card": ["unito"], "catalogue": ["polito"]}])

    def test_rename_detected_by_folded_name(self):
        cards = [{"id": "deg-1", "name": {"it": "Informatica generale", "en": "CS"}}]
        rep = c.diff_report(COURSES, {"deg-1": ["unito|L-31|informatica"]}, cards)
        self.assertEqual(rep["renamed"][0]["catalogue"], ["Informatica"])
        rep = c.diff_report(COURSES, {"deg-1": ["unito|L-31|informatica"]}, [{"id": "deg-1", "name": {"it": "INFORMATICA", "en": "CS"}}])
        self.assertEqual(rep["renamed"], [])


class Enrich(unittest.TestCase):
    ROWS = [
        {"key": "polito|L-8|ingegneria fisica", "ateneo": "polito", "url": "https://www.polito.it/didattica/corsi-di-laurea/ingegneria-fisica"},
        {"key": "unito|L-30|fisica", "ateneo": "unito", "url": "https://www.unito.it/x/fisica"},
        {"key": "unito|L-31|informatica", "ateneo": "unito", "url": None},
    ]

    def test_sets_university_and_url_after_tags_and_leaves_other_fields_alone(self):
        cards = [{"id": "a", "name": {"it": "Fisica"}, "tags": {"en": []}, "icon": "x"}]
        out, changes = c.enrich_cards(cards, self.ROWS, {"a": ["unito|L-30|fisica", "polito|L-8|ingegneria fisica"]})
        self.assertEqual(changes, ["a"])
        self.assertEqual(list(out[0]), ["id", "name", "tags", "university", "url", "icon"])
        self.assertEqual(out[0]["university"], ["polito", "unito"])
        self.assertEqual(out[0]["url"]["unito"], "https://www.unito.it/x/fisica")
        self.assertEqual(out[0]["name"], cards[0]["name"])

    def test_no_url_key_when_the_catalogue_has_no_page(self):
        out, _ = c.enrich_cards([{"id": "a", "tags": {}}], self.ROWS, {"a": ["unito|L-31|informatica"]})
        self.assertEqual(out[0]["university"], ["unito"])
        self.assertNotIn("url", out[0])

    def test_card_whose_programme_left_the_catalogue_keeps_old_data(self):
        card = {"id": "a", "tags": {}, "university": ["polito"], "url": {"polito": "https://old"}}
        out, changes = c.enrich_cards([card], self.ROWS, {"a": ["unito|L-1|gone"]})
        self.assertEqual(out, [card])
        self.assertEqual(changes, [])

    def test_unmapped_card_is_untouched_and_rerun_changes_nothing(self):
        card = {"id": "b", "tags": {}}
        out, changes = c.enrich_cards([card], self.ROWS, {})
        self.assertEqual((out, changes), ([card], []))
        mapped = {"a": ["unito|L-30|fisica"]}
        once, _ = c.enrich_cards([{"id": "a", "tags": {}}], self.ROWS, mapped)
        twice, changes = c.enrich_cards(once, self.ROWS, mapped)
        self.assertEqual((once, changes), (twice, []))


class Merge(unittest.TestCase):
    def test_same_programme_on_two_campuses_and_languages_merges(self):
        rows = [
            {"ateneo": "unito", "classe": "L-18", "nome": "MANAGEMENT", "sede": "TORINO", "lingua": "Italiano", "url": "u1", "source": "x"},
            {"ateneo": "unito", "classe": "L-18", "nome": "Management", "sede": "BIELLA", "lingua": "Inglese", "url": None, "source": "x"},
        ]
        merged = c.merge_rows(rows)
        self.assertEqual(len(merged), 1)
        m = next(iter(merged.values()))
        self.assertEqual(m["sedi"], ["TORINO", "BIELLA"])
        self.assertEqual(m["lingue"], ["Italiano", "Inglese"])
        self.assertEqual(m["url"], "u1")


if __name__ == "__main__":
    unittest.main()
