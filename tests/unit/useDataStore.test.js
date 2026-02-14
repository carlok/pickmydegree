/**
 * Unit tests for useDataStore (load, save, clear).
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
});
