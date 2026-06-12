import { render, fireEvent } from '@testing-library/react-native';
import { DeedRow } from '@/ui/components/DeedRow';
import { DeedRow as DeedRowType, DeedLogRow } from '@/db/schema';

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
      <DeedRow deed={deed} log={null} onChange={onChange} />
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
      <DeedRow deed={deed} log={log} onChange={onChange} />
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
      <DeedRow deed={deed} log={null} onChange={onChange} />
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
      <DeedRow deed={deed} log={log} onChange={onChange} />
    );

    // Increment chips should be hidden by default
    expect(queryByTestId('btn-chip-33')).toBeNull();

    // Expand the row
    fireEvent.press(getByTestId('btn-expand'));

    // Check that chips are displayed
    expect(getByTestId('btn-chip-1')).toBeTruthy();
    expect(getByTestId('btn-chip-10')).toBeTruthy();
    expect(getByTestId('btn-chip-33')).toBeTruthy();
    expect(getByTestId('btn-chip-100')).toBeTruthy();

    // Tap +33 chip
    fireEvent.press(getByTestId('btn-chip-33'));
    expect(onChange).toHaveBeenCalledWith('not_yet', 33);
  });
});
