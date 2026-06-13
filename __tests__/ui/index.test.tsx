import { render, fireEvent } from '@testing-library/react-native';
import DayScreen from '@/app/(tabs)/index';
import { useScorecard, useDatesPercentages, useOldestLogDate } from '@/state/deedStore';
import { ar } from '@/i18n/ar';

// Mock the state store module
jest.mock('@/state/deedStore', () => ({
  useScorecard: jest.fn(),
  useDatesPercentages: jest.fn(),
  setDeedLog: jest.fn(),
  useOldestLogDate: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockScorecard = [
  {
    section: { id: 'sec_morning', name: 'الصبح', sortOrder: 1, deleted: false, createdAt: '2026-06-12', deletedAt: null, updatedAt: Date.now() },
    items: [
      {
        deed: {
          id: 'deed_fajr',
          userId: null,
          definitionId: 'fajr',
          sectionId: 'sec_morning',
          name: 'صلاة الفجر',
          type: 'boolean',
          schedule: 'daily',
          createdAt: '2026-06-12',
          sortOrder: 1,
          deletedAt: null,
          linkedDhikrId: null,
          target: null,
          updatedAt: Date.now(),
          deleted: false,
          dirty: false,
        },
        log: {
          id: '2026-06-12:deed_fajr',
          userId: null,
          deedId: 'deed_fajr',
          date: '2026-06-12',
          status: 'done',
          value: null,
          note: null,
          updatedAt: Date.now(),
          deleted: false,
          dirty: false,
        },
      },
      {
        deed: {
          id: 'deed_duha',
          userId: null,
          definitionId: 'duha',
          sectionId: 'sec_morning',
          name: 'صلاة الضحى',
          type: 'boolean',
          schedule: 'daily',
          createdAt: '2026-06-12',
          sortOrder: 2,
          deletedAt: null,
          linkedDhikrId: null,
          target: null,
          updatedAt: Date.now(),
          deleted: false,
          dirty: false,
        },
        log: null,
      },
    ],
  },
];

describe('DayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useScorecard as jest.Mock).mockReturnValue(mockScorecard);
    (useDatesPercentages as jest.Mock).mockReturnValue({});
    (useOldestLogDate as jest.Mock).mockReturnValue(null);
  });

  it('renders uncompleted deeds under their sections and completed deeds in completed section', () => {
    const { getByText, queryByText } = render(<DayScreen />);

    // Uncompleted deed should be visible in main list
    expect(getByText('صلاة الضحى')).toBeTruthy();

    // Completed deed should NOT be visible by default (since completed section starts collapsed)
    expect(queryByText('صلاة الفجر')).toBeNull();

    // The completed accordion header should show the count
    const completedHeaderLabel = ar.summary.completedSection;
    expect(getByText(completedHeaderLabel)).toBeTruthy();
    expect(getByText('(1)')).toBeTruthy(); // Western Arabic numeral format
  });

  it('expands completed section to show completed deeds on press', () => {
    const { getByText, queryByText } = render(<DayScreen />);

    expect(queryByText('صلاة الفجر')).toBeNull();

    // Tap on completed section header
    fireEvent.press(getByText(ar.summary.completedSection));

    // Completed deed should now be visible
    expect(getByText('صلاة الفجر')).toBeTruthy();
  });

  it('fades out checked items and removes them from the uncompleted list after 300ms', () => {
    jest.useFakeTimers();
    const { getByText, queryByText, rerender, getByTestId } = render(<DayScreen />);

    // Initially, Duha is uncompleted (visible)
    expect(getByText('صلاة الضحى')).toBeTruthy();

    // Toggle Duha (صلاة الضحى) to done
    fireEvent.press(getByTestId('btn-toggle'));

    // Mock scorecard change where Duha status is completed
    const updatedScorecard = [
      {
        section: { id: 'sec_morning', name: 'الصبح', sortOrder: 1, deleted: false, createdAt: '2026-06-12', deletedAt: null, updatedAt: Date.now() },
        items: [
          {
            deed: mockScorecard[0].items[0].deed,
            log: mockScorecard[0].items[0].log,
          },
          {
            deed: mockScorecard[0].items[1].deed,
            log: {
              id: '2026-06-12:deed_duha',
              userId: null,
              deedId: 'deed_duha',
              date: '2026-06-12',
              status: 'done',
              value: null,
              note: null,
              updatedAt: Date.now(),
              deleted: false,
              dirty: false,
            },
          },
        ],
      },
    ];

    (useScorecard as jest.Mock).mockReturnValue(updatedScorecard);

    // Rerender with the updated scorecard (as if hook returned updated status)
    rerender(<DayScreen />);

    // Immediately after checking (before 450ms elapsed), Duha should STILL be visible in the uncompleted list
    expect(getByText('صلاة الضحى')).toBeTruthy();

    // Fast-forward 450ms
    jest.advanceTimersByTime(450);

    // Rerender to apply state updates from the animation callback
    rerender(<DayScreen />);

    // Now Duha should be filtered out of the uncompleted section
    expect(queryByText('صلاة الضحى')).toBeNull();

    jest.useRealTimers();
  });
});
