/**
 * Unit tests for useDataStore (load, save, clear).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDataStore } from '../../src/composables/useDataStore';

describe('useDataStore', () => {
  let store;

  beforeEach(() => {
    store = useDataStore();
    store.clear();
  });

  it('load returns null when nothing saved', () => {
    expect(store.load()).toBeNull();
  });

  it('save and load round-trip', () => {
    const data = { phase: 'phase1', survivingDegrees: [{ id: 'a' }] };
    store.save(data);
    expect(store.load()).toEqual(data);
  });

  it('clear removes saved data', () => {
    store.save({ phase: 'welcome' });
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('load returns null when stored value is invalid JSON', () => {
    localStorage.setItem('pick-my-degree-v1', 'not json');
    expect(store.load()).toBeNull();
  });

  describe('when localStorage throws (blocked site data)', () => {
    const real = globalThis.localStorage;
    const blocked = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    };

    beforeEach(() => { vi.stubGlobal('localStorage', blocked); });
    afterEach(() => { vi.stubGlobal('localStorage', real); });

    it('load returns null, save and clear do not throw', () => {
      expect(store.load()).toBeNull();
      expect(() => store.save({ phase: 'welcome' })).not.toThrow();
      expect(() => store.clear()).not.toThrow();
    });
  });
});
