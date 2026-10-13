import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useConfig, useLanguage, useSession } from '@components';
import {
  UserProfileForm as ProfileController,
  SafeAreaContainerLayout,
  OText
} from '@ui';
import { useNavigation } from '@react-navigation/native';

const KeyboardView = styled.KeyboardAvoidingView`
  flex-grow: 1;
`;

interface Props {
  navigation: any;
  route: any;
}

const Profile = (props: Props) => {
  const theme = useTheme();
  const [, t] = useLanguage();
  const [{ configs }] = useConfig();
  const [{ user }, { refreshUserInfo }] = useSession();
  const navigation = useNavigation();

  const profileProps = {
    ...props,
    useSessionUser: true,
    useValidationFields: true,
    isFocused: navigation.getState()?.routes[navigation.getState()?.index]?.name === 'Profile',
    goToBack: () => props.navigation?.canGoBack() && props.navigation.goBack(),
    onNavigationRedirect: (route: string, params: any) =>
      props.navigation.navigate(route, params),
    isShowDriverStatus: !configs?.available_status_enabled || configs?.available_status_enabled?.value !== '0'
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const isProfileRoute = navigation.getState()?.routes[navigation.getState()?.index]?.name === 'Profile'
      isProfileRoute && user?.id && refreshUserInfo()
    });

    return unsubscribe;
  }, []);

  return (
    <>
      <KeyboardView
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: theme.colors.backgroundPage }}>
        <SafeAreaContainerLayout
          style={{
            backgroundColor: theme.colors.backgroundPage,
          }}>
          <ProfileController {...profileProps} />
        </SafeAreaContainerLayout>
      </KeyboardView>
    </>
  );
};

export default Profile;
