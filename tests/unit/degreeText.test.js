/**
 * The Vite plugin splits degrees.json into a light core list and per-language text chunks.
 */
import { describe, it, expect } from 'vitest';
import { allDegrees, loadDegreeText } from '../../src/data';
import source from '../../src/data/degrees.json';

describe('degree data split', () => {
  it('core cards keep id, icon, category and both names, but no description or tags', () => {
    expect(allDegrees).toHaveLength(source.length);
    allDegrees.forEach((d, i) => {
      expect(d.id).toBe(source[i].id);
      expect(d.name).toEqual(source[i].name);
      expect(d.category).toBe(source[i].category);
      expect(d.description).toBeUndefined();
      expect(d.tags).toBeUndefined();
    });
  });

  it.each(['en', 'it'])('%s text has a description and 3 tags for every degree', async (loc) => {
    const text = await loadDegreeText(loc);
    expect(Object.keys(text).sort()).toEqual(source.map((d) => d.id).sort());
    source.forEach((d) => {
      expect(text[d.id].description).toBe(d.description[loc]);
      expect(text[d.id].tags).toEqual(d.tags[loc]);
    });
  });

  it('loads each language once and reuses it', async () => {
    expect(loadDegreeText('it')).toBe(loadDegreeText('it'));
  });

  it('falls back to English for an unknown locale', async () => {
    expect(await loadDegreeText('fr')).toBe(await loadDegreeText('en'));
  });
});
