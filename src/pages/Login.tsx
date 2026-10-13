import React from 'react';
import { Platform } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Container, LoginForm } from '@ui';
import RNRestart from 'react-native-restart'
import settings from '../config.json'

import { useSession } from '@components'
import { getProjectLoginSuccessPlan } from '../navigators/getProjectSwitchPlan'

const KeyboardView = styled.KeyboardAvoidingView`
  flex: 1;
`;

export const Login = ({ navigation, route, projectChanged }: any) => {
  const theme = useTheme();
  const [, { login: loginMethod }] = useSession()

  const loginProps = {
    navigation,
    useLoginByCellphone: true,
    useLoginByEmail: true,
    allowedLevels: [4],
    validateDeveloperMode: settings.validate_developer_mode,
    handleSuccessLogin: async (user: any) => {
      const plan = getProjectLoginSuccessPlan({ projectChanged, user })
      if (!plan.shouldPersistSessionAndRestart) return
      await loginMethod(plan.session)
      RNRestart.restart()
    },
    onNavigationRedirect: (page: string) => {
      if (!page) return;
      navigation.navigate(page);
    },
    notificationState: route?.params?.notification_state,
    // useRootPoint: settings.use_root_point
  };

  return (
    <KeyboardView
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Container style={{ backgroundColor: theme.colors.white }}>
        <LoginForm {...loginProps} />
      </Container>
    </KeyboardView>
  );
};

export default Login;
