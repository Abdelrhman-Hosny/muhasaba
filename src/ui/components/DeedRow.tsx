import { useRef, useState } from 'react';
import { View, Text, Pressable, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DeedRow as DeedRowType, DeedLogRow } from '@/db/schema';

/**
 * Custom gesture-based slider component using standard React Native touch properties.
 */
function CustomSlider({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (val: number) => void;
}) {
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
          backgroundColor: 'rgba(0,0,0,0.1)',
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

export function DeedRow({
  deed,
  log,
  onChange,
}: {
  deed: DeedRowType;
  log: DeedLogRow | null;
  onChange: (status: 'done' | 'not_yet', value: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = log?.status === 'done';

  // Boolean checkbox deed
  if (deed.type === 'boolean') {
    return (
      <Pressable
        testID="btn-toggle"
        onPress={() => onChange(done ? 'not_yet' : 'done', null)}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: done ? theme.colors.surfaceDone : theme.colors.surface,
          borderWidth: 1,
          borderColor: done ? theme.colors.primary : 'transparent',
          padding: 16,
          borderRadius: 12,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: done ? theme.colors.text : theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>
          {deed.name}
        </Text>
        <Ionicons
          name={done ? 'checkbox' : 'square-outline'}
          size={26}
          color={done ? theme.colors.primary : theme.colors.muted}
        />
      </Pressable>
    );
  }

  // Measured deed (e.g. pages count, target-based slider/stepper)
  const target = deed.target ?? 1;
  const currentValue = log?.value ?? 0;
  const progressPct = Math.min(100, (currentValue / target) * 100);

  const handleIncrement = (amount: number) => {
    const nextVal = Math.max(0, Math.min(target, currentValue + amount));
    const nextStatus = nextVal >= target ? 'done' : 'not_yet';
    onChange(nextStatus, nextVal);
  };

  const isLargeCounter = target >= 15 || deed.linkedDhikrId !== null;

  return (
    <View
      style={{
        backgroundColor: done ? theme.colors.surfaceDone : theme.colors.surface,
        borderWidth: 1,
        borderColor: done ? theme.colors.primary : 'transparent',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      <Pressable
        testID="btn-expand"
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: done ? theme.colors.text : theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>
            {deed.name}
          </Text>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>
            ({toArabicNumeral(currentValue)}/{toArabicNumeral(target)})
          </Text>
        </View>
        <Pressable
          testID="btn-quick-toggle"
          onPress={() => {
            const nextVal = done ? 0 : target;
            const nextStatus = done ? 'not_yet' : 'done';
            onChange(nextStatus, nextVal);
          }}
          hitSlop={12}
        >
          <Ionicons
            name={done ? 'checkbox' : 'square-outline'}
            size={26}
            color={done ? theme.colors.primary : theme.colors.muted}
          />
        </Pressable>
      </Pressable>

      {/* Embedded Progress bar only visible when collapsed */}
      {!expanded && (
        <View style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.05)', width: '100%' }}>
          <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: theme.colors.primary }} />
        </View>
      )}

      {/* Gesture slider or increment chips visible when expanded */}
      {expanded && (
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 20,
            backgroundColor: 'rgba(0,0,0,0.02)',
          }}
        >
          {isLargeCounter ? (
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {/* +1 */}
              <Pressable
                testID="btn-chip-1"
                onPress={() => handleIncrement(1)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+١</Text>
              </Pressable>

              {/* +5 */}
              <Pressable
                testID="btn-chip-5"
                onPress={() => handleIncrement(5)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+٥</Text>
              </Pressable>

              {/* +10 */}
              <Pressable
                testID="btn-chip-10"
                onPress={() => handleIncrement(10)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+١٠</Text>
              </Pressable>

              {/* +50 */}
              <Pressable
                testID="btn-chip-50"
                onPress={() => handleIncrement(50)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+٥٠</Text>
              </Pressable>

              {/* -10 (Correction) */}
              <Pressable
                testID="btn-chip-dec"
                onPress={() => handleIncrement(-10)}
                disabled={currentValue === 0}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: currentValue === 0 ? 'rgba(0,0,0,0.1)' : theme.colors.text,
                  opacity: currentValue === 0 ? 0.5 : 1,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: currentValue === 0 ? 'rgba(0,0,0,0.3)' : theme.colors.text, fontSize: 15 }}>-١٠</Text>
              </Pressable>

              {/* Reset (تصفير) */}
              <Pressable
                testID="btn-chip-reset"
                onPress={() => handleIncrement(-currentValue)}
                disabled={currentValue === 0}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: currentValue === 0 ? 'rgba(0,0,0,0.1)' : 'red',
                  opacity: currentValue === 0 ? 0.5 : 1,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: currentValue === 0 ? 'rgba(0,0,0,0.3)' : 'red', fontSize: 15 }}>تصفير</Text>
              </Pressable>
            </View>
          ) : (
            <CustomSlider
              value={currentValue}
              max={target}
              onChange={(val) => {
                const nextStatus = val >= target ? 'done' : 'not_yet';
                onChange(nextStatus, val);
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}
