import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeColor } from '@/theme/helpers';

export type SafeAreaEdges = ('top' | 'left' | 'right' | 'bottom')[];

const ALL_EDGES: SafeAreaEdges = ['top', 'left', 'right', 'bottom'];
/** Inside a tab or over a bottom bar: the bar keeps the bottom inset itself. */
const ABOVE_A_BAR: SafeAreaEdges = ['top', 'left', 'right'];

interface Props {
  /** The sides that keep the system's inset (all by default). */
  edges?: SafeAreaEdges;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

/**
 * The screen wrapper: the page canvas (`background`) inside the system's
 * safe-area insets (`useSafeAreaInsets`, never a platform guess). A screen of
 * a bottom tab passes `edges={['top', 'left', 'right']}`, so its bottom inset
 * does not stack with the tab bar's.
 */
export const SafeAreaContainer = ({ edges = ALL_EDGES, style, children }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sides = edges.join(' ');
  const styles = useMemo(() => {
    const inset = (edge: SafeAreaEdges[number]) => sides.split(' ').includes(edge) ? insets[edge] : 0;
    return StyleSheet.create({
      screen: {
        flex: 1,
        backgroundColor: themeColor(theme, 'background'),
        paddingTop: inset('top'),
        paddingBottom: inset('bottom'),
        paddingLeft: inset('left'),
        paddingRight: inset('right'),
      },
    });
  }, [theme, insets, sides]);

  return <View style={[styles.screen, style]}>{children}</View>;
};

interface LayoutProps {
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * The wrapper of a screen above a bottom bar (the tabs, the screens with a
 * floating action bar): `SafeAreaContainer` without the bottom inset. It lays
 * no sides: a screen's top bar has its own (`ONavbar`) and its scroll carries
 * the page gutter (`layout.page_gutter`) on its content, so a card's side
 * shadow is not clipped by a frame.
 */
export const SafeAreaContainerLayout = ({ style, children }: LayoutProps) => (
  // The screen's own children sit directly in the padded container, with no view of their own between
  // them: a keyboard-avoiding view reads its position from its parent (`frame.y`), so a wrapper at the
  // top of the safe area hid the top inset from it and it lifted its screen that much too little.
  <SafeAreaContainer edges={ABOVE_A_BAR} style={style}>{children}</SafeAreaContainer>
);
