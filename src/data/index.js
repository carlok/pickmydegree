import core from 'virtual:degrees-core';

/** Every degree card: id, icon, category and names. Descriptions and tags load per language, see loadDegreeText. */
export const allDegrees = core;

const loaders = {
  en: () => import('virtual:degree-text/en'),
  it: () => import('virtual:degree-text/it'),
};
const cache = new Map();

/** Resolves to `{ [degreeId]: { description, tags } }` for the locale; fetched once, then cached. */
export function loadDegreeText(locale) {
  const key = loaders[locale] ? locale : 'en';
  if (!cache.has(key)) {
    cache.set(
      key,
      loaders[key]().then((m) => m.default).catch((err) => {
        cache.delete(key);
        throw err;
      })
    );
  }
  return cache.get(key);
}
