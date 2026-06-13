// react-native-mmkv requires a native module; mock it for unit tests.
// v4 API: storage is created via createMMKV({ id }); the instance uses
// set / getString / remove / clearAll.
jest.mock('react-native-mmkv', () => {
  function createMMKV() {
    const store = new Map();
    return {
      set: (k, v) => store.set(k, v),
      getString: (k) => store.get(k),
      getNumber: (k) => store.get(k),
      remove: (k) => store.delete(k),
      delete: (k) => store.delete(k),
      clearAll: () => store.clear(),
      getAllKeys: () => Array.from(store.keys()),
    };
  }
  return { createMMKV };
});
