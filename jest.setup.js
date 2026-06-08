// MMKV requires a native module; mock it for unit tests.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    MMKV: class {
      set(k, v) { store.set(k, v); }
      getString(k) { return store.get(k); }
      delete(k) { store.delete(k); }
      clearAll() { store.clear(); }
    },
  };
});
