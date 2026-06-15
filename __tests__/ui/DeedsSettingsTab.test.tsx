import { render, act } from '@testing-library/react-native';
import { DeedsSettingsTab } from '@/features/settings/components/DeedsSettingsTab';
import { reorderDeeds } from '@/state/deedStore';
import { DeedRow } from '@/db/schema';

jest.mock('@/state/deedStore', () => ({ reorderDeeds: jest.fn() }));

// Local mock that captures each list's onReorder so the test can fire a reorder,
// and still renders items (with the real reorderItems) like the production list.
const reorderHandlers: ((e: { from: number; to: number }) => void)[] = [];
jest.mock('react-native-reorderable-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    useReorderableDrag: () => () => {},
    reorderItems: (arr: unknown[], from: number, to: number) => {
      const next = [...arr];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    },
    NestedReorderableList: ({ data = [], renderItem, keyExtractor, onReorder }: any) => {
      reorderHandlers.push(onReorder);
      return React.createElement(
        View,
        null,
        data.map((item: any, index: number) =>
          React.createElement(
            React.Fragment,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem({ item, index })
          )
        )
      );
    },
  };
});

const makeDeed = (id: string, name: string): DeedRow =>
  ({
    id,
    name,
    type: 'boolean',
    schedule: 'daily',
    target: null,
    linkedDhikrId: null,
    sectionId: 'sec-1',
  } as unknown as DeedRow);

const structure = [
  {
    section: { id: 'sec-1', name: 'الصبح' } as any,
    deeds: [makeDeed('a', 'صلاة الفجر'), makeDeed('b', 'سنة الفجر'), makeDeed('c', 'أذكار الصباح')],
  },
];

beforeEach(() => {
  reorderHandlers.length = 0;
  jest.clearAllMocks();
});

describe('DeedsSettingsTab reordering', () => {
  it('renders a drag handle for every deed', () => {
    const { getByTestId } = render(
      <DeedsSettingsTab
        scorecardStructure={structure}
        dhikrNamesMap={new Map()}
        onEditDeed={jest.fn()}
        onDeleteDeed={jest.fn()}
      />
    );

    expect(getByTestId('btn-reorder-deed-a')).toBeTruthy();
    expect(getByTestId('btn-reorder-deed-b')).toBeTruthy();
    expect(getByTestId('btn-reorder-deed-c')).toBeTruthy();
  });

  it('persists the new order when a deed is dragged to a new position', () => {
    render(
      <DeedsSettingsTab
        scorecardStructure={structure}
        dhikrNamesMap={new Map()}
        onEditDeed={jest.fn()}
        onDeleteDeed={jest.fn()}
      />
    );

    // Move the first deed (a) to the last position.
    act(() => reorderHandlers[0]({ from: 0, to: 2 }));

    expect(reorderDeeds).toHaveBeenCalledWith(['b', 'c', 'a']);
  });
});
