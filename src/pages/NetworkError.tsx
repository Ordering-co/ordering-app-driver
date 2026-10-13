import React from 'react';
import { NetworkError as NetworkErrorScreen, SafeAreaContainer } from '@ui';

const NetworkError = () => {
  return (
    <SafeAreaContainer>
      <NetworkErrorScreen />
    </SafeAreaContainer>
  );
};

export default NetworkError;
