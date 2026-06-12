import { render, fireEvent } from '@testing-library/react-native';
import CountersScreen from '@/app/(tabs)/counters';
import { useDhikrs, incrementDhikrCount, addDhikrCounter, deleteDhikrCounter } from '@/state/deedStore';

// Mock the state store module
jest.mock('@/state/deedStore', () => ({
  useDhikrs: jest.fn(),
  incrementDhikrCount: jest.fn(),
  addDhikrCounter: jest.fn(),
  deleteDhikrCounter: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockDhikrs = [
  {
    dhikr: {
      id: 'd1',
      userId: 'u1',
      name: 'استغفار',
      sortOrder: 1,
      target: 100,
      createdAt: '2026-06-12',
      deletedAt: null,
      updatedAt: Date.now(),
      deleted: false,
    },
    log: {
      id: '2026-06-12:d1',
      userId: 'u1',
      dhikrId: 'd1',
      date: '2026-06-12',
      count: 25,
      updatedAt: Date.now(),
      deleted: false,
    },
  },
  {
    dhikr: {
      id: 'd2',
      userId: 'u1',
      name: 'سبحان الله',
      sortOrder: 2,
      target: null,
      createdAt: '2026-06-12',
      deletedAt: null,
      updatedAt: Date.now(),
      deleted: false,
    },
    log: null,
  },
];

describe('CountersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDhikrs as jest.Mock).mockReturnValue(mockDhikrs);
  });

  it('renders list of counters', () => {
    const { getByText } = render(<CountersScreen />);

    expect(getByText('استغفار')).toBeTruthy();
    expect(getByText('سبحان الله')).toBeTruthy();
    expect(getByText('الحالي: ٢٥')).toBeTruthy();
  });

  it('taps keypad to increment active counter', () => {
    const { getByTestId } = render(<CountersScreen />);

    // Click on '+10' keypad button
    fireEvent.press(getByTestId('btn-keypad-10'));

    expect(incrementDhikrCount).toHaveBeenCalledWith(expect.any(String), 'd1', 10);
  });

  it('custom count saves correctly', () => {
    const { getByTestId } = render(<CountersScreen />);

    // Enter custom count
    const input = getByTestId('input-custom-count');
    fireEvent.changeText(input, '150');

    // Submit input
    fireEvent(input, 'submitEditing');

    expect(incrementDhikrCount).toHaveBeenCalledWith(expect.any(String), 'd1', 150);
  });

  it('subtract mode subtracts count correctly', () => {
    const { getByTestId } = render(<CountersScreen />);

    // Select subtract mode
    fireEvent.press(getByTestId('btn-mode-sub'));

    // Click on '10' keypad button
    fireEvent.press(getByTestId('btn-keypad-10'));

    expect(incrementDhikrCount).toHaveBeenCalledWith(expect.any(String), 'd1', -10);
  });

  it('taps reset to reset counter to 0', () => {
    const { getByTestId } = render(<CountersScreen />);

    fireEvent.press(getByTestId('btn-reset'));

    // Resets by calling with negative current count (-25)
    expect(incrementDhikrCount).toHaveBeenCalledWith(expect.any(String), 'd1', -25);
  });

  it('adds custom counter via modal', () => {
    const { getByTestId } = render(<CountersScreen />);

    // Open add modal
    fireEvent.press(getByTestId('btn-new-counter'));

    // Fill modal form
    fireEvent.changeText(getByTestId('input-new-name'), 'الحمد لله');
    fireEvent.changeText(getByTestId('input-new-target'), '33');

    // Submit
    fireEvent.press(getByTestId('btn-modal-add'));

    expect(addDhikrCounter).toHaveBeenCalledWith('الحمد لله', 33);
  });

  it('opens drawer on hamburger menu press', () => {
    const { getByTestId, getByText } = render(<CountersScreen />);

    fireEvent.press(getByTestId('btn-drawer-toggle'));

    expect(getByText('الإعدادات')).toBeTruthy();
  });
});
