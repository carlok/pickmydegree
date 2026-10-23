const STORAGE_KEY = 'pick-my-degree-v1';

// localStorage can throw (blocked site data, private modes, quota), so every access is guarded.
export function useDataStore() {
  const load = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const save = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable; fail silently
    }
  };

  const clear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable; nothing to clear
    }
  };

  return {
    load,
    save,
    clear
  };
}
