/*
  Drop-in replacement for the Claude-artifact `window.storage` API,
  backed by the browser's own localStorage. This lets App.jsx run
  completely unmodified outside Claude.

  Behavior matches what App.jsx expects:
  - get(key)   -> { key, value }   (throws if the key doesn't exist)
  - set(key, value) -> { key, value }
  - delete(key) -> { key, deleted: true }
  - list(prefix) -> { keys: [...] }
*/

if (typeof window !== "undefined" && !window.storage) {
  const NS = "quotewise:";

  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(NS + key);
      if (raw === null) {
        throw new Error(`storage key not found: ${key}`);
      }
      return { key, value: raw };
    },

    async set(key, value) {
      localStorage.setItem(NS + key, value);
      return { key, value };
    },

    async delete(key) {
      localStorage.removeItem(NS + key);
      return { key, deleted: true };
    },

    async list(prefix = "") {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(NS + prefix))
        .map((k) => k.slice(NS.length));
      return { keys };
    },
  };
}
