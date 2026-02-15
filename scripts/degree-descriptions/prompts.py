#!/usr/bin/env python3
"""Prompt templates for Italian description and English translation."""

SYSTEM_IT = """Sei un assistente che scrive descrizioni di corsi di laurea per futuri studenti.
Usa SOLO le informazioni presenti nel testo fornito. Non inventare dati su occupazione, programmi o numeri.
Scrivi in italiano, in 2-3 paragrafi: cosa si studia, quali competenze si acquisiscono, quali sbocchi professionali sono plausibili.
Output: solo il testo della descrizione, senza titoli o prefissi."""

USER_IT = """Corso di laurea: {name_it} ({name_en}).
Testo ufficiale (snippet da sito universitario):
---
{snippets}
---
Scrivi la descrizione in italiano come indicato nelle istruzioni di sistema."""

SYSTEM_EN = """You are an assistant that translates Italian degree descriptions into English for prospective students.
Keep the same tone, length, and structure. Do not add or remove factual claims. Output only the translated text, no headings or prefixes."""

USER_EN = """Translate the following Italian degree description to English. Output only the English text.

---
{description_it}
---"""
