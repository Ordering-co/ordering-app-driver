import React, { useEffect, useMemo } from 'react';
import { NativeModules, Platform, StatusBar, processColor } from 'react-native';
import { DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { useTheme } from 'styled-components/native';
import { isLight } from '@orderingco/ordering-theme-engine/colors';
import RootNavigator from './navigators/RootNavigator';
import { navigationRef } from './navigators/NavigationRef';
import { themeColor, themeFontFace } from './theme/helpers';

/**
 * The app's one status bar (decision D8), mounted once inside the theme
 * provider: its content is dark over a light `background` and light over a
 * dark one. React Native 0.87 removed the `backgroundColor` prop (Android 15+
 * draws the bar edge to edge): the color behind the bar is the screen's own.
 * It no longer tells the connection: the connection pill of the orders header does.
 *
 * On Android the activity pads its content by the system bars, so what shows
 * behind them is the window's background: the app's own `WindowBackground`
 * module paints it in the theme's `background` (white until then, from the
 * activity's style), and again whenever the theme changes it.
 */
export const ThemedStatusBar = () => {
  const theme = useTheme();
  const background = themeColor(theme, 'background');
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NativeModules.WindowBackground?.setColor(processColor(background));
  }, [background]);
  return (
    <StatusBar
      animated
      barStyle={isLight(background) === false ? 'light-content' : 'dark-content'}
    />
  );
};

/**
 * The fonts React Navigation 7 asks its theme for (`regular`, `medium`, `bold`,
 * `heavy`): the theme's body font file at the weight of each, never the
 * library's system font and never a `fontWeight` (the file carries the weight).
 * The weights are the library's own.
 */
const navigationFontsOf = (theme: any) => Object.fromEntries(
  Object.entries(DefaultTheme.fonts).map(([name, { fontWeight }]) => [
    name,
    themeFontFace(theme, 'body', Number(fontWeight) || fontWeight)
  ])
) as unknown as NavigationTheme['fonts']

/**
 * What React Navigation paints by itself (the card under a screen during a
 * transition, the frame of the tab bar) in the theme's colors by role, in
 * place of the library's own light grey, and its text in the theme's font.
 */
export const navigationThemeOf = (theme: any): NavigationTheme => ({
  dark: isLight(themeColor(theme, 'background')) === false,
  colors: {
    primary: themeColor(theme, 'primary'),
    background: themeColor(theme, 'background'),
    card: themeColor(theme, 'surface'),
    text: themeColor(theme, 'text'),
    border: themeColor(theme, 'border'),
    notification: themeColor(theme, 'danger'),
  },
  fonts: navigationFontsOf(theme),
});

const AppContainer = ({ onReady, configuredLocalProject }: { onReady?: () => void; configuredLocalProject?: boolean }) => {
  const theme = useTheme();
  const navigationTheme = useMemo(() => navigationThemeOf(theme), [theme]);
  return (
    <>
      <ThemedStatusBar />
      <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={onReady}>
        <RootNavigator configuredLocalProject={configuredLocalProject} />
      </NavigationContainer>
    </>
  );
};

export default AppContainer;
