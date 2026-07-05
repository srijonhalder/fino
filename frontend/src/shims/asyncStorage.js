/**
 * Web-compatible shim for @react-native-async-storage/async-storage
 * Uses window.localStorage under the hood.
 */
const AsyncStorage = {
  getItem: async (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // quota exceeded or private mode
    }
  },
  removeItem: async (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
  clear: async () => {
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
  },
  getAllKeys: async () => {
    try {
      return Object.keys(window.localStorage);
    } catch {
      return [];
    }
  },
  multiGet: async (keys) => {
    try {
      return keys.map((k) => [k, window.localStorage.getItem(k)]);
    } catch {
      return keys.map((k) => [k, null]);
    }
  },
  multiSet: async (pairs) => {
    try {
      pairs.forEach(([k, v]) => window.localStorage.setItem(k, v));
    } catch {
      // ignore
    }
  },
  multiRemove: async (keys) => {
    try {
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};

export default AsyncStorage;
