import React, { useState, useRef } from 'react';
import { View, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/ui/theme';

interface CustomSliderProps {
  value: number;
  max: number;
  onChange: (val: number) => void;
}

/**
 * Custom gesture-based slider component using standard React Native touch properties.
 */
export function CustomSlider({ value, max, onChange }: CustomSliderProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const [leftOffset, setLeftOffset] = useState(0);

  const handleTouch = (evt: GestureResponderEvent) => {
    if (width === 0) return;
    const touchX = evt.nativeEvent.pageX - leftOffset;
    const pct = Math.max(0, Math.min(1, touchX / width));
    const val = Math.round(pct * max);
    onChange(val);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
    trackRef.current?.measure((x, y, w, h, pageX) => {
      setLeftOffset(pageX);
    });
  };

  const progressPct = Math.min(100, (value / max) * 100);

  return (
    <View
      testID="slider-track"
      ref={trackRef}
      onLayout={onLayout}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      style={{
        height: 40,
        justifyContent: 'center',
        width: '100%',
      }}
    >
      {/* Slider Track Background */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.colors.translucentBgActive,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Active Progress Fill */}
        <View
          style={{
            height: '100%',
            width: `${progressPct}%`,
            backgroundColor: theme.colors.primary,
            borderRadius: 3,
          }}
        />

        {/* Sliding Thumb handle */}
        <View
          style={{
            position: 'absolute',
            left: `${progressPct}%`,
            top: -7, // centers thumb vertically
            marginLeft: -10, // offsets half thumb width
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: theme.colors.primary,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
          }}
        />
      </View>
    </View>
  );
}
