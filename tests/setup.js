/**
 * Global test setup: mock localStorage and AudioContext so composables run in Node.
 */
import { vi } from 'vitest';

const storage = {};
const mockLocalStorage = {
  getItem(key) {
    return storage[key] ?? null;
  },
  setItem(key, value) {
    storage[key] = String(value);
  },
  removeItem(key) {
    delete storage[key];
  },
  clear() {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
  get length() {
    return Object.keys(storage).length;
  },
  key(i) {
    return Object.keys(storage)[i] ?? null;
  },
};

vi.stubGlobal('localStorage', mockLocalStorage);

// A `function` (not an arrow) so the mock can be called with `new`, as Vitest 4 requires.
const mockAudioContext = vi.fn().mockImplementation(function () { return {
  state: 'running',
  currentTime: 0,
  createOscillator: () => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }),
  createGain: () => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }),
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
}; });

vi.stubGlobal('AudioContext', mockAudioContext);
vi.stubGlobal('webkitAudioContext', mockAudioContext);

beforeEach(() => {
  mockLocalStorage.clear();
});
