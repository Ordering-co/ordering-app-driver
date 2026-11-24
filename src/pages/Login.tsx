import React from 'react';
import { LoginForm } from '@ui';
import RNRestart from 'react-native-restart'
import settings from '../config.json'

import { useSession } from '@components'
import { getProjectLoginSuccessPlan } from '../navigators/getProjectSwitchPlan'

export const Login = ({ navigation, route, projectChanged }: any) => {
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

  // The form lays its own screen: its bar, its scroll and the button under it, all above the keyboard.
  return <LoginForm {...loginProps} />;
};

export default Login;
