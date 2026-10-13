import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';

type SkeletonBoneProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  flex?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export const SkeletonBone = ({
  width,
  height = 12,
  borderRadius = 6,
  flex,
  delay = 0,
  style,
}: SkeletonBoneProps) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.7)).current;
  const isPercentageWidth = typeof width === 'string' && width.endsWith('%');

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [delay, opacity]);

  const bone = (
    <Animated.View
      style={[
        {
          width: isPercentageWidth ? '100%' : width,
          height,
          flex,
          borderRadius,
          backgroundColor: theme.colors.inputSignup,
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
