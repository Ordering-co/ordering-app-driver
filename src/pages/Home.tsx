import React from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import settings from '../config.json'
import { Home as HomePage } from '@ui';

export const Home = (props: any) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.black,
    },
  });

  const homeProps = {
    ...props,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      props.navigation.navigate(page, params);
    },
    title: {
      key: 'LETS_START_TO_SEE_YOUR_ORDERS',
      value: "Let's start to see your orders",
    },
    useRootPoint: settings.use_root_point
  };

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor={theme.colors.transparent}
        barStyle="light-content"
        showHideTransition="fade"
        animated
      />
      <HomePage {...homeProps} />
    </View>
  );
};

export default Home;
