import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { themeGutter, themeSpace } from '@/theme/helpers';
import { SafeAreaContainer } from './SafeAreaContainer';

interface Props {
  /** The screen's top bar (`ONavbar`): fixed above the scroll, never part of it. */
  header?: React.ReactNode;
  /** A screen that lays its own sides (a list out to the edges). */
  noPadding?: boolean;
  style?: ViewStyle;
  forwardRef?: any;
  children?: React.ReactNode;
}

/**
 * A screen that scrolls: the screen wrapper (`SafeAreaContainer`: the canvas
 * inside the system's insets), its top bar fixed above the scroll, and a scroll
 * whose content sits on the page gutter (`layout.page_gutter`), the same on
 * both platforms. The gutter is on the content, not on the scroll's frame, so
 * a card's side shadow is not clipped.
 */
export const Container = ({ header, noPadding, style, forwardRef, children }: Props) => {
  const theme = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    scroll: { flex: 1 },
    padded: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg') },
  }), [theme]);

  return (
    <SafeAreaContainer style={style}>
      {header}
      <ScrollView
        ref={forwardRef}
        style={styles.scroll}
        contentContainerStyle={!noPadding && styles.padded}
        keyboardShouldPersistTaps='handled'
      >
        {children}
      </ScrollView>
    </SafeAreaContainer>
  );
};
