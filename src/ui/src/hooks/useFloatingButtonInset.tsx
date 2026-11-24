import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useTheme } from 'styled-components/native';
import { barBottomSpace } from '@/theme/helpers';

/**
 * The space under the bottom bar's buttons (FloatingButton), `barBottomSpace`: on iOS the
 * system's bottom inset or the theme's minimum, whichever is larger; on Android the inset
 * the screen reads (0 in the activity's padded screens, the bars' height in a modal's own
 * window), so the gap over the navigation area is the same everywhere. Screens inside the
 * bottom tabs already end above the tab bar, so there it is 0.
 * Anything that reserves room for the bar must add this same value.
 */
export const useFloatingButtonInset = (): number => {
  const insets = useSafeAreaInsets();
  const theme: any = useTheme();
  const isInsideBottomTabs = React.useContext(BottomTabBarHeightContext) !== undefined;

  return isInsideBottomTabs ? 0 : barBottomSpace(theme, insets.bottom);
};
