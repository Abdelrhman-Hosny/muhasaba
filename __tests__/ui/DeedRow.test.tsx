import { render, fireEvent } from '@testing-library/react-native';
import { DeedRow } from '@/ui/components/DeedRow';
import { DeedRow as DeedRowType, DeedLogRow } from '@/db/schema';

jest.mock('@/domain/azkarData', () => ({
  azkarCategories: [
    {
      index: 0,
      title: 'أذكار الصباح',
      search: 'أذكار الصباح',
      items: [
        { dhikr: 'Test Morning Dhikr', description: 'Test desc', count: 1, reference: 'Ref' },
      ],
    },
    {
      index: 1,
      title: 'أذكار المساء',
      search: 'أذكار المساء',
      items: [
        { dhikr: 'Test Evening Dhikr', description: 'Test desc', count: 1, reference: 'Ref' },
      ],
    },
  ],
}));

describe('DeedRow', () => {
  it('toggles boolean status on press', () => {
    const onChange = jest.fn();
    const deed: DeedRowType = {
      id: 'deed_fajr',
      userId: null,
      definitionId: 'fajr',
      sectionId: 'sec_prayers',
      name: 'الفجر',
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
    };

    const { getByTestId } = render(
      <DeedRow deed={deed} log={null} date="2026-06-12" onChange={onChange} />
    );

    fireEvent.press(getByTestId('btn-toggle'));
    expect(onChange).toHaveBeenCalledWith('done', null);
  });

  it('allows sliding measured deeds when expanded', () => {
    const onChange = jest.fn();
    const deed: DeedRowType = {
      id: 'deed_quran',
      userId: null,
      definitionId: 'quran_reading',
      sectionId: 'sec_quran',
      name: 'ورد التلاوة',
      type: 'measured',
      schedule: 'daily',
      createdAt: '2026-06-12',
      sortOrder: 1,
      deletedAt: null,
      linkedDhikrId: null,
      target: 10,
      updatedAt: Date.now(),
      deleted: false,
      dirty: false,
    };

    const log: DeedLogRow = {
      id: '2026-06-12:deed_quran',
      userId: null,
      deedId: 'deed_quran',
      date: '2026-06-12',
      status: 'not_yet',
      value: 5,
      note: null,
      updatedAt: Date.now(),
      deleted: false,
      dirty: false,
    };

    const { getByTestId, queryByTestId } = render(
      <DeedRow deed={deed} log={log} date="2026-06-12" onChange={onChange} />
    );

    // Slider track should be hidden by default
    expect(queryByTestId('slider-track')).toBeNull();

    // Expand the row
    fireEvent.press(getByTestId('btn-expand'));

    const track = getByTestId('slider-track');
    expect(track).toBeTruthy();

    // Trigger onLayout to set track width
    fireEvent(track, 'layout', {
      nativeEvent: {
        layout: { width: 100 }
      }
    });

    // Simulate drag gesture at pageX = 80 (80% progress, target 10 * 0.8 = 8)
    fireEvent(track, 'touchMove', {
      nativeEvent: { pageX: 80 }
    });

    expect(onChange).toHaveBeenCalledWith('not_yet', 8);
  });

  it('instantly marks measured deeds as done when checkbox is tapped', () => {
    const onChange = jest.fn();
    const deed: DeedRowType = {
      id: 'deed_quran',
      userId: null,
      definitionId: 'quran_reading',
      sectionId: 'sec_quran',
      name: 'ورد التلاوة',
      type: 'measured',
      schedule: 'daily',
      createdAt: '2026-06-12',
      sortOrder: 1,
      deletedAt: null,
      linkedDhikrId: null,
      target: 10,
      updatedAt: Date.now(),
      deleted: false,
      dirty: false,
    };

    const { getByTestId } = render(
      <DeedRow deed={deed} log={null} date="2026-06-12" onChange={onChange} />
    );

    // Press quick toggle button (the checkbox icon)
    fireEvent.press(getByTestId('btn-quick-toggle'));

    expect(onChange).toHaveBeenCalledWith('done', 10);
  });

  it('allows incrementing using chips for large target deeds when expanded', () => {
    const onChange = jest.fn();
    const deed: DeedRowType = {
      id: 'deed_istighfar',
      userId: null,
      definitionId: null,
      sectionId: 'sec_morning',
      name: 'الاستغفار',
      type: 'measured',
      schedule: 'daily',
      createdAt: '2026-06-12',
      sortOrder: 4,
      deletedAt: null,
      linkedDhikrId: 'dhikr_istighfar',
      target: 100,
      updatedAt: Date.now(),
      deleted: false,
      dirty: false,
    };

    const log: DeedLogRow = {
      id: '2026-06-12:deed_istighfar',
      userId: null,
      deedId: 'deed_istighfar',
      date: '2026-06-12',
      status: 'not_yet',
      value: 0,
      note: null,
      updatedAt: Date.now(),
      deleted: false,
      dirty: false,
    };

    const { getByTestId, queryByTestId } = render(
      <DeedRow deed={deed} log={log} date="2026-06-12" onChange={onChange} />
    );

    // Increment chips should be hidden by default
    expect(queryByTestId('btn-chip-5')).toBeNull();

    // Expand the row
    fireEvent.press(getByTestId('btn-expand'));

    // Check that chips are displayed
    expect(getByTestId('btn-chip-1')).toBeTruthy();
    expect(getByTestId('btn-chip-5')).toBeTruthy();
    expect(getByTestId('btn-chip-10')).toBeTruthy();
    expect(getByTestId('btn-chip-50')).toBeTruthy();

    // Tap +5 chip
    fireEvent.press(getByTestId('btn-chip-5'));
    expect(onChange).toHaveBeenCalledWith('not_yet', 5);
  });

  it('toggles to not_done status on press of not-done button for boolean deeds', () => {
    const onChange = jest.fn();
    const deed: DeedRowType = {
      id: 'deed_fajr',
      userId: null,
      definitionId: 'fajr',
      sectionId: 'sec_prayers',
      name: 'الفجر',
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
    };

    const { getByTestId } = render(
      <DeedRow deed={deed} log={null} date="2026-06-12" onChange={onChange} />
    );

    fireEvent.press(getByTestId('btn-not-done'));
    expect(onChange).toHaveBeenCalledWith('not_done', null);
  });

  it('toggles to not_done status on press of not-done button for measured deeds', () => {
    const onChange = jest.fn();
    const deed: DeedRowType = {
      id: 'deed_quran',
      userId: null,
      definitionId: 'quran_reading',
      sectionId: 'sec_quran',
      name: 'ورد التلاوة',
      type: 'measured',
      schedule: 'daily',
      createdAt: '2026-06-12',
      sortOrder: 1,
      deletedAt: null,
      linkedDhikrId: null,
      target: 10,
      updatedAt: Date.now(),
      deleted: false,
      dirty: false,
    };

    const { getByTestId } = render(
      <DeedRow deed={deed} log={null} date="2026-06-12" onChange={onChange} />
    );

    fireEvent.press(getByTestId('btn-not-done'));
    expect(onChange).toHaveBeenCalledWith('not_done', null);
  });

  it('automatically marks adhkar deed as done when all individual azkar are completed', () => {
    const onChange = jest.fn();
    const deed: DeedRowType = {
      id: 'deed_adhkar_morning',
      userId: null,
      definitionId: 'adhkar_morning',
      sectionId: 'sec_morning',
      name: 'أذكار الصباح',
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
    };

    const { getByTestId } = render(
      <DeedRow deed={deed} log={null} date="2026-06-12" onChange={onChange} />
    );

    // Open the modal
    fireEvent.press(getByTestId('btn-book'));

    // Tap the first dhikr card (index 0) to increment it
    fireEvent.press(getByTestId('dhikr-card-0'));

    // It should automatically mark the deed as done since it has completed 1/1 count
    expect(onChange).toHaveBeenCalledWith('done', null);
  });
});
