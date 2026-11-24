import React, { useEffect, useMemo } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from 'styled-components/native';
import settings from '../config.json'
import { Home as HomePage } from '@ui';
import { themeColor } from '@/theme/helpers';
import { setContentUnderBars } from '@/utils/contentUnderBars';

export const Home = (props: any) => {
  const theme = useTheme();

  // The hero's photo reaches the screen's four edges: while this screen is the one shown (the
  // stack keeps it mounted under the login) the activity does not pad the content by the system
  // bars; the hero keeps its own content inside the safe area. On Android the status bar's icons
  // are light over the photo's dark overlay, and the app's one status bar takes them back when
  // this screen leaves.
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    setContentUnderBars(true);
    return () => setContentUnderBars(false);
  }, [focused]);

  // Behind the hero's photo while it loads: dark, as the photo's own ink expects.
  const styles = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: themeColor(theme, 'inverse_surface'),
    },
  }), [theme]);

  const homeProps = {
    ...props,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      props.navigation.navigate(page, params);
    },
    useRootPoint: settings.use_root_point
  };

  return (
    <View style={styles.root}>
      {focused && Platform.OS === 'android' && <StatusBar animated barStyle='light-content' />}
      <HomePage {...homeProps} />
    </View>
  );
};

export default Home;
