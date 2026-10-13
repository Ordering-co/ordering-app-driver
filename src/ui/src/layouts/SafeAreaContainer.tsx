import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Platform,
  StatusBar,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SafeAreaEdges = ('top' | 'left' | 'right' | 'bottom')[];

const defaultEdges: SafeAreaEdges = ['top', 'left', 'right', 'bottom'];

/**
 * When used inside a bottom tab screen, pass edges={['top','left','right']} so
 * paddingBottom does not stack with the tab bar (avoids a white gap above it).
 */
export const SafeAreaContainer = (props: any) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const edges: SafeAreaEdges = props.edges ?? defaultEdges;

  const paddingTop = edges.includes('top') ? insets.top : 0;
  const paddingBottom = edges.includes('bottom') ? insets.bottom : 0;
  const paddingLeft = edges.includes('left') ? insets.left : 0;
  const paddingRight = edges.includes('right') ? insets.right : 0;

  const { children, style, edges: _edges } = props;

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.backgroundPage,
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const SafeAreaContainerLayout = (props: any) => {
  const theme = useTheme();
  const netInfo = useNetInfo()

  const [statusColor, setStatusColor] = useState<string | null>(null)
  const [orientation, setOrientation] = useState(
    Dimensions.get('window').width < Dimensions.get('window').height
      ? 'Portrait'
      : 'Landscape',
  );

  Dimensions.addEventListener('change', ({ window: { width, height } }) => {
    if (width < height) {
      setOrientation('Portrait');
    } else {
      setOrientation('Landscape');
    }
  });

  useEffect(() => {
    if (netInfo.isConnected === false) {
      setStatusColor(theme.colors.danger500)
    }

    if (netInfo.isConnected && statusColor) {
      setStatusColor(theme.colors.success500)
      setTimeout(() => {
        setStatusColor(null)
      }, 2000);
    }
  }, [netInfo.isConnected])

  return (
    <SafeAreaContainer edges={['top', 'left', 'right']}>
      <View
        style={{
          paddingHorizontal: props.paddingHorizontal ?? 20,
          paddingTop: 0,
          paddingBottom: 0,
          flex: 1,
          ...props.style
        }}>
        <StatusBar
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'}
          {...statusColor && ({ backgroundColor: statusColor })}
        />
        {props.children}
      </View>
    </SafeAreaContainer>
  );
};
