import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DeedsLibraryScreen from '@/app/library';
import {
  addDeed,
  deleteDeed,
  addDhikrCounter,
  useDeedDefinitions,
  useScorecardStructure,
} from '@/state/deedStore';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

jest.mock('@/state/deedStore', () => ({
  addDeed: jest.fn(),
  deleteDeed: jest.fn(),
  addDhikrCounter: jest.fn(),
  useDeedDefinitions: jest.fn(),
  useScorecardStructure: jest.fn(),
}));

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

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

const definitions = [
  {
    id: 'qiym_layl',
    name: 'قيام الليل',
    type: 'boolean',
    defaultSchedule: 'daily',
    defaultSectionId: 'sec_isha_night',
    bundleId: null,
    linkedDhikrTemplate: null,
  },
];

describe('DeedsLibraryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDeedDefinitions as jest.Mock).mockReturnValue(definitions);
    (useLiveQuery as jest.Mock).mockReturnValue({ data: [] });
  });

  it('adds the deed when an inactive item is tapped', () => {
    (useScorecardStructure as jest.Mock).mockReturnValue([]); // nothing active
    const { getByTestId } = render(<DeedsLibraryScreen />);

    fireEvent.press(getByTestId('lib-checkbox-qiym_layl'));

    expect(addDeed).toHaveBeenCalledTimes(1);
    expect(deleteDeed).not.toHaveBeenCalled();
  });

  it('removes the active deed when an active item is tapped', async () => {
    (useScorecardStructure as jest.Mock).mockReturnValue([
      {
        section: { id: 'sec_isha_night', name: 'العشاء والليل', sortOrder: 5, updatedAt: 0 },
        deeds: [
          {
            id: 'deed_qiym_layl',
            definitionId: 'qiym_layl',
            sectionId: 'sec_isha_night',
            bundleId: null,
            name: 'قيام الليل',
            type: 'boolean',
            schedule: 'daily',
            createdAt: '2026-06-12',
            sortOrder: 1,
            linkedDhikrId: null,
            target: null,
            updatedAt: 0,
            deleted: false,
          },
        ],
      },
    ]);

    const { getByTestId } = render(<DeedsLibraryScreen />);

    fireEvent.press(getByTestId('lib-checkbox-qiym_layl'));

    await waitFor(() => {
      expect(deleteDeed).toHaveBeenCalledWith('deed_qiym_layl');
    });
    expect(addDeed).not.toHaveBeenCalled();
  });

  it('shows صلاة الجماعة as a per-prayer library bundle and adds a single prayer', () => {
    (useScorecardStructure as jest.Mock).mockReturnValue([]);
    (useDeedDefinitions as jest.Mock).mockReturnValue([
      { id: 'jamaah_fajr', name: 'جماعة الفجر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_morning', bundleId: 'bundle_jamaah', linkedDhikrTemplate: null },
      { id: 'jamaah_dhuhr', name: 'جماعة الظهر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_dhuhr', bundleId: 'bundle_jamaah', linkedDhikrTemplate: null },
    ]);

    const { getByText, getByTestId } = render(<DeedsLibraryScreen />);

    // Bundle renders under its friendly name and is collapsed by default
    fireEvent.press(getByText('صلاة الجماعة'));

    // Opt a single prayer in
    fireEvent.press(getByTestId('lib-checkbox-jamaah_fajr'));

    expect(addDeed).toHaveBeenCalledTimes(1);
    expect(addDeed).toHaveBeenCalledWith(
      'جماعة الفجر',
      'sec_morning',
      'boolean',
      'daily',
      null,
      null,
      'jamaah_fajr'
    );
  });
});
