import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AdhkarList } from '@/features/adhkar/components/AdhkarList';
import { DhikrItem } from '@/domain/azkarData';

const items: DhikrItem[] = [
  { dhikr: 'سبحان الله', description: '', count: 3, reference: 'مسلم' },
  { dhikr: 'الحمد لله', description: '', count: 1, reference: '' },
];

describe('AdhkarList', () => {
  it('calls onIncrement with next value when a card is pressed', () => {
    const onIncrement = jest.fn();
    const { getByTestId } = render(
      <AdhkarList items={items} counts={[0, 0]} onIncrement={onIncrement} onResetItem={jest.fn()} />
    );
    fireEvent.press(getByTestId('dhikr-card-0'));
    expect(onIncrement).toHaveBeenCalledWith(0, 1);
  });

  it('does not increment a card that is already complete', () => {
    const onIncrement = jest.fn();
    const { getByTestId } = render(
      <AdhkarList items={items} counts={[3, 0]} onIncrement={onIncrement} onResetItem={jest.fn()} />
    );
    fireEvent.press(getByTestId('dhikr-card-0'));
    expect(onIncrement).not.toHaveBeenCalled();
  });
});
