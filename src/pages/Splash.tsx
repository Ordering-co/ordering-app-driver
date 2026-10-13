import React from 'react';
import { View, StyleSheet } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

const LogoSplash = styled.ImageBackground`
  width: 100%;
  height: 100%;
  flex: 1;
  background-color: ${(props: any) => props.theme.colors.backgroundPage};
`;

const Splash = () => {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <LogoSplash
        source={theme.images.general.loadingSplash}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default Splash;
