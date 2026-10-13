import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './navigators/RootNavigator';
import { navigationRef } from './navigators/NavigationRef';

const AppContainer = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
};

export default AppContainer;
