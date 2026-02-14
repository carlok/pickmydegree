import { ref } from 'vue';

const STORAGE_KEY = 'pick-my-degree-v1';

export function useDataStore() {
  const load = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  const save = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
} catch {
    // Storage full or unavailable; fail silently
  }
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    load,
    save,
    clear
  };
}
