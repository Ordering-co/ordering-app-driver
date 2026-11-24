import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { themeMotion } from '@/theme/helpers';

type SkeletonBoneProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  flex?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const SkeletonBone = ({
  width,
  height = 12,
  borderRadius,
  flex,
  delay = 0,
  style,
  testID,
}: SkeletonBoneProps) => {
  const theme: any = useTheme();
  const skeleton = theme.native.components.skeleton.base;
  // No pulse when the theme turns motion off or the system asks to reduce it.
  const halfCycle = themeMotion(theme, 'slow').duration * 5 / 3;
  const opacity = useRef(new Animated.Value(0.7)).current;
  const isPercentageWidth = typeof width === 'string' && width.endsWith('%');

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: halfCycle,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: halfCycle,
          useNativeDriver: true,
        }),
      ]),
    );

    if (!halfCycle) {
      opacity.setValue(1);
      return;
    }
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, halfCycle]);

  const bone = (
    <Animated.View
      testID={testID}
      style={[
        {
          width: isPercentageWidth ? '100%' : width,
          height,
          flex,
          borderRadius: borderRadius ?? skeleton.radius,
          backgroundColor: skeleton.color,
          opacity,
        },
        style,
      ]}
    />
  );

  if (isPercentageWidth) {
    return <View style={{ width }}>{bone}</View>;
  }

  return bone;
};
