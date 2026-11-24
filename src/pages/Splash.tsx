import React from 'react';
import styled from 'styled-components/native';
import { themeColor } from '@/theme/helpers';
import { BUNDLED_IMAGES } from '@/theme/bundledImages';
import { useSplashLogo } from '@/utils/splash';

// The loading page after the native launch splash (docs/SPLASH.md): the same square logo, centred,
// 120 x 120 (pt on iOS, dp on Android), as both native splashes draw it, so the hand-over does not
// move or resize it. A build constant, not a theme value: the native splash cannot change at run
// time. The picture is `launch-logo.png`, generated from the same source as the native logos.
const LAUNCH_LOGO_SIZE = 120;

const SplashContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: any) => themeColor(theme, 'background')};
`;

const LaunchLogo = styled.Image`
  width: ${LAUNCH_LOGO_SIZE}px;
  height: ${LAUNCH_LOGO_SIZE}px;
`;

const Splash = () => {
  // The native splash stays up until this logo has loaded and been drawn (src/utils/splash.ts).
  const { onLoad, onError } = useSplashLogo();
  return (
    <SplashContainer testID="splash-container">
      <LaunchLogo
        source={BUNDLED_IMAGES.general.loadingSplash}
        resizeMode="contain"
        fadeDuration={0}
        onLoad={onLoad}
        onError={onError}
      />
    </SplashContainer>
  );
};

export default Splash;
