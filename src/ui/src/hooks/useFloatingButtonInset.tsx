import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Extra bottom space the floating buttons need to clear the iOS home indicator.
 * Screens inside the bottom tabs already end above the tab bar, so there it is 0.
 * Anything that reserves room for the floating buttons must add this same value.
 */
export const useFloatingButtonInset = (): number => {
  const insets = useSafeAreaInsets();
  const isInsideBottomTabs = React.useContext(BottomTabBarHeightContext) !== undefined;

  return Platform.OS === 'ios' && !isInsideBottomTabs ? insets.bottom : 0;
};
