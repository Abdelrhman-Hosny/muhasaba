import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from '@/app/settings';
import {
  addDeedBundle,
  updateDeed,
  updateDeedBundle,
  deleteDeed,
  deleteDeedBundle,
  addDhikrCounter,
  updateDhikrCounter,
  deleteDhikrCounter,
  useSections,
  useScorecardStructure,
  useDeedDefinitions,
} from '@/state/deedStore';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

// Mock state store
jest.mock('@/state/deedStore', () => ({
  addDeedBundle: jest.fn(),
  updateDeed: jest.fn(),
  updateDeedBundle: jest.fn(),
  deleteDeed: jest.fn(),
  deleteDeedBundle: jest.fn(),
  addDhikrCounter: jest.fn(),
  updateDhikrCounter: jest.fn(),
  deleteDhikrCounter: jest.fn(),
  useSections: jest.fn(),
  useScorecardStructure: jest.fn(),
  useDeedDefinitions: jest.fn(),
}));

// Mock drizzle live query
jest.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: jest.fn(),
}));

jest.mock('@/db/client', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

let mockLocalSearchParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    setParams: jest.fn((params) => {
      mockLocalSearchParams = { ...mockLocalSearchParams, ...params };
    }),
  }),
  useLocalSearchParams: () => mockLocalSearchParams,
  Stack: {
    Screen: jest.fn(() => null),
  },
}));

const mockSections = [
  { id: 'sec_morning', name: 'الصبح', sortOrder: 1, updatedAt: Date.now() },
  { id: 'sec_evening', name: 'المساء', sortOrder: 2, updatedAt: Date.now() },
];

const mockScorecardStructure = [
  {
    section: { id: 'sec_morning', name: 'الصبح', sortOrder: 1, updatedAt: Date.now() },
    deeds: [
      {
        id: 'deed_fajr',
        definitionId: 'fajr',
        sectionId: 'sec_morning',
        name: 'صلاة الفجر',
        type: 'boolean',
        schedule: 'daily',
        createdAt: '2026-06-12',
        sortOrder: 1,
        linkedDhikrId: null,
        target: null,
        updatedAt: Date.now(),
        deleted: false,
      },
    ],
  },
];

const mockDhikrs = [
  {
    id: 'dhikr_istighfar',
    userId: null,
    name: 'استغفار',
    sortOrder: 1,
    target: 100,
    createdAt: '2026-06-12',
    deletedAt: null,
    updatedAt: Date.now(),
    deleted: false,
  },
];

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalSearchParams = {};
    (useSections as jest.Mock).mockReturnValue(mockSections);
    (useScorecardStructure as jest.Mock).mockReturnValue(mockScorecardStructure);
    (useLiveQuery as jest.Mock).mockReturnValue({ data: mockDhikrs });
    (useDeedDefinitions as jest.Mock).mockReturnValue([
      { id: 'fajr', name: 'صلاة الفجر', type: 'boolean', defaultSchedule: 'daily' },
      { id: 'sunnah_fajr', name: 'سنة الفجر', type: 'boolean', defaultSchedule: 'daily' },
    ]);
  });

  it('renders sections and deeds correctly', () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText('الصبح')).toBeTruthy();
    expect(getByText('صلاة الفجر')).toBeTruthy();
    expect(getByText('يوميًا')).toBeTruthy();
  });

  it('switches tabs between deeds and dhikrs', () => {
    const { getByText, queryByText } = render(<SettingsScreen />);

    // Initially in deeds tab
    expect(getByText('صلاة الفجر')).toBeTruthy();

    // Click on dhikrs tab
    fireEvent.press(getByText('عدادات الأذكار'));

    // Should render the dhikr list and hide deeds list
    expect(getByText('استغفار')).toBeTruthy();
    expect(queryByText('صلاة الفجر')).toBeNull();
  });

  it('calls deleteDeed when delete button is pressed and confirmed', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert');
    const { getByTestId } = render(<SettingsScreen />);

    // Press delete button
    fireEvent.press(getByTestId('btn-delete-deed-deed_fajr'));

    expect(spyAlert).toHaveBeenCalled();
    // Simulate clicking the delete confirm button (index 1 of options)
    const options = spyAlert.mock.calls[0][2];
    const confirmOption = options?.find((opt) => opt.style === 'destructive');
    expect(confirmOption).toBeDefined();

    if (confirmOption && confirmOption.onPress) {
      await confirmOption.onPress();
    }

    expect(deleteDeed).toHaveBeenCalledWith('deed_fajr');
  });

  it('adds custom deed via modal', async () => {
    mockLocalSearchParams = { openCustomDeedModal: 'true' };
    const { getByTestId } = render(<SettingsScreen />);

    // Fill deed name
    fireEvent.changeText(getByTestId('input-deed-name'), 'ورد التسبيح');

    // Save
    fireEvent.press(getByTestId('btn-save-deed'));

    await waitFor(() => {
      expect(addDeedBundle).toHaveBeenCalledWith(
        'ورد التسبيح',
        ['sec_morning'],
        'boolean',
        'daily',
        null,
        null
      );
    });
  });

  it('adds custom deed with numeric target via switch toggle', async () => {
    mockLocalSearchParams = { openCustomDeedModal: 'true' };
    const { getByTestId, queryByTestId } = render(<SettingsScreen />);

    // Target input field should initially not be visible since showTargetInput defaults to false
    expect(queryByTestId('input-deed-target')).toBeNull();

    // Fill deed name
    fireEvent.changeText(getByTestId('input-deed-name'), 'قراءة صفحات قرآن');

    // Toggle the target switch
    fireEvent(getByTestId('switch-deed-target'), 'valueChange', true);

    // Target input field should now be visible
    expect(getByTestId('input-deed-target')).toBeTruthy();

    // Fill target count
    fireEvent.changeText(getByTestId('input-deed-target'), '15');

    // Save
    fireEvent.press(getByTestId('btn-save-deed'));

    await waitFor(() => {
      expect(addDeedBundle).toHaveBeenCalledWith(
        'قراءة صفحات قرآن',
        ['sec_morning'],
        'measured',
        'daily',
        15,
        null
      );
    });
  });

  it('adds custom dhikr counter via modal', async () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);

    // Switch to dhikrs tab
    fireEvent.press(getByText('عدادات الأذكار'));

    // Open Add Dhikr Modal
    fireEvent.press(getByTestId('btn-add-dhikr'));

    // Fill dhikr name and target
    fireEvent.changeText(getByTestId('input-dhikr-name'), 'لا إله إلا الله');
    fireEvent.changeText(getByTestId('input-dhikr-target'), '200');

    // Save
    fireEvent.press(getByTestId('btn-save-dhikr'));

    await waitFor(() => {
      expect(addDhikrCounter).toHaveBeenCalledWith('لا إله إلا الله', 200);
    });
  });

  it('adds custom deed with specific days selection via bubbles', async () => {
    mockLocalSearchParams = { openCustomDeedModal: 'true' };
    const { getByTestId } = render(<SettingsScreen />);

    // Fill deed name
    fireEvent.changeText(getByTestId('input-deed-name'), 'صيام التطوع');

    // Toggle off Sunday (0) and Saturday (6)
    fireEvent.press(getByTestId('btn-day-bubble-0'));
    fireEvent.press(getByTestId('btn-day-bubble-6'));

    // Save
    fireEvent.press(getByTestId('btn-save-deed'));

    await waitFor(() => {
      // should be active on: 1, 2, 3, 4, 5
      expect(addDeedBundle).toHaveBeenCalledWith(
        'صيام التطوع',
        ['sec_morning'],
        'boolean',
        '1,2,3,4,5',
        null,
        null
      );
    });
  });

  it('expands a deed across multiple selected sections into a bundle', async () => {
    mockLocalSearchParams = { openCustomDeedModal: 'true' };
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.changeText(getByTestId('input-deed-name'), 'صلاة الجماعة');

    // sec_morning is selected by default; also select sec_evening
    fireEvent.press(getByTestId('multichip-sec_evening'));

    fireEvent.press(getByTestId('btn-save-deed'));

    await waitFor(() => {
      expect(addDeedBundle).toHaveBeenCalledWith(
        'صلاة الجماعة',
        ['sec_morning', 'sec_evening'],
        'boolean',
        'daily',
        null,
        null
      );
    });
  });

  it('prompts this-only vs all when deleting a bundled deed', async () => {
    (useScorecardStructure as jest.Mock).mockReturnValue([
      {
        section: { id: 'sec_morning', name: 'الصبح', sortOrder: 1, updatedAt: Date.now() },
        deeds: [
          {
            id: 'deed_jamaah_sec_morning',
            definitionId: null,
            sectionId: 'sec_morning',
            bundleId: 'bundle_jamaah',
            name: 'صلاة الجماعة',
            type: 'boolean',
            schedule: 'daily',
            createdAt: '2026-06-12',
            sortOrder: 20,
            linkedDhikrId: null,
            target: null,
            updatedAt: Date.now(),
            deleted: false,
          },
        ],
      },
    ]);

    const spyAlert = jest.spyOn(Alert, 'alert');
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('btn-delete-deed-deed_jamaah_sec_morning'));

    const options = spyAlert.mock.calls[0][2];
    // this-only deletes the single row; all deletes the bundle
    const thisOnly = options?.find((o) => o.text === 'هذا القسم فقط');
    const all = options?.find((o) => o.text === 'كل الأقسام');
    expect(thisOnly).toBeDefined();
    expect(all).toBeDefined();

    await all!.onPress!();
    expect(deleteDeedBundle).toHaveBeenCalledWith('bundle_jamaah');
    expect(deleteDeed).not.toHaveBeenCalled();
  });
});
