/**
 * Data-integrity checks for src/data/degrees.json and the locale files that describe it.
 * The card list is edited by hand and by scripts, so structural mistakes should fail here, not in the browser.
 */
import { describe, it, expect } from 'vitest';
import degrees from '../../src/data/degrees.json';
import en from '../../src/i18n/en.json';
import it_ from '../../src/i18n/it.json';

const categorySlug = (c) => c.replace(/\s*&\s*/g, '_').replace(/\s+/g, '_').toLowerCase();
const LOCALES = ['en', 'it'];

describe('degrees.json', () => {
  it('has unique, well-formed ids', () => {
    const ids = degrees.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^deg-\d{3,}$/));
  });

  it('has no duplicate names within a language', () => {
    LOCALES.forEach((loc) => {
      const names = degrees.map((d) => d.name[loc].toLowerCase());
      expect(new Set(names).size, `duplicate ${loc} names`).toBe(names.length);
    });
  });

  it('has name, description and 3 tags in both languages for every degree', () => {
    degrees.forEach((d) => {
      LOCALES.forEach((loc) => {
        expect(d.name?.[loc]?.trim(), `${d.id} name.${loc}`).toBeTruthy();
        expect(d.description?.[loc]?.trim(), `${d.id} description.${loc}`).toBeTruthy();
        expect(d.tags?.[loc], `${d.id} tags.${loc}`).toHaveLength(3);
        d.tags[loc].forEach((tag) => expect(tag.trim(), `${d.id} empty tag`).toBeTruthy());
      });
    });
  });

  it('uses a category that has a label in both locales', () => {
    const categories = [...new Set(degrees.map((d) => d.category))];
    expect(categories.length).toBeGreaterThan(1);
    categories.forEach((c) => {
      expect(en.category[categorySlug(c)], `en category.${categorySlug(c)}`).toBeTruthy();
      expect(it_.category[categorySlug(c)], `it category.${categorySlug(c)}`).toBeTruthy();
    });
  });

  it('keeps Italian names in sentence case, not Title Case Every Word', () => {
    // "Chimica E Tecnologia Farmaceutica": a capitalised conjunction in the middle is the tell.
    degrees.forEach((d) => {
      expect(d.name.it, d.id).not.toMatch(/ (E|Di|Del|Della|Delle|Dei|Degli|Per|In|Ed) [A-Z]/);
    });
  });

  it('only has optional university/url fields in a valid shape', () => {
    degrees.forEach((d) => {
      if (d.university !== undefined) {
        expect(Array.isArray(d.university), `${d.id} university`).toBe(true);
        d.university.forEach((u) => expect(['polito', 'unito']).toContain(u));
      }
      if (d.url !== undefined) {
        expect(Object.keys(d.url).every((k) => ['polito', 'unito'].includes(k)), `${d.id} url keys`).toBe(true);
        Object.values(d.url).forEach((u) => expect(u).toMatch(/^https:\/\//));
      }
    });
  });
});

describe('locale files', () => {
  const flatten = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
    );

  it('define exactly the same keys', () => {
    const enKeys = flatten(en).sort();
    const itKeys = flatten(it_).sort();
    expect(itKeys).toEqual(enKeys);
  });
});
