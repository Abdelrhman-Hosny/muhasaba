import { render, fireEvent } from '@testing-library/react-native';
import { PrayerRow } from '@/ui/components/PrayerRow';

describe('PrayerRow', () => {
  it('cycles status on press', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <PrayerRow prayer="fajr" status="not_yet" onChange={onChange} />,
    );
    fireEvent.press(getByText('الفجر'));
    expect(onChange).toHaveBeenCalledWith('on_time');
  });
});
