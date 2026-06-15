// react-native-reorderable-list pulls in reanimated/worklets, whose native parts
// aren't initialized under jest. Provide lightweight stand-ins: lists render their
// items synchronously, the drag hook is a no-op, and reorderItems keeps real logic.
jest.mock('react-native-reorderable-list', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');

  const ScrollViewContainer = React.forwardRef((props, ref) =>
    React.createElement(ScrollView, { ...props, ref })
  );

  const NestedReorderableList = ({ data = [], renderItem, keyExtractor, ...rest }) =>
    React.createElement(
      View,
      rest,
      data.map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem({ item, index })
        )
      )
    );

  const reorderItems = (arr, from, to) => {
    const next = [...arr];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  return {
    __esModule: true,
    default: NestedReorderableList,
    NestedReorderableList,
    ScrollViewContainer,
    reorderItems,
    useReorderableDrag: () => () => {},
    useIsActive: () => false,
  };
});

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
