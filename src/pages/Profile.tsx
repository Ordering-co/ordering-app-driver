import * as React from 'react';
import { useConfig, useSession } from '@components';
import {
  UserProfileForm as ProfileController,
  SafeAreaContainerLayout
} from '@ui';
import { useNavigation } from '@react-navigation/native';

interface Props {
  navigation: any;
  route: any;
}

const Profile = (props: Props) => {
  const [{ configs }] = useConfig();
  const [{ user }, { refreshUserInfo }] = useSession();
  const navigation = useNavigation();

  /** The name of the tab the tabs navigator has focused. */
  const focusedTab = () => {
    const state = navigation.getState();
    return state?.routes[state.index]?.name;
  };

  const profileProps = {
    ...props,
    useSessionUser: true,
    useValidationFields: true,
    isFocused: focusedTab() === 'Profile',
    goToBack: () => props.navigation?.canGoBack() && props.navigation.goBack(),
    onNavigationRedirect: (route: string, params: any) =>
      props.navigation.navigate(route, params),
    isShowDriverStatus: !configs?.available_status_enabled || configs?.available_status_enabled?.value !== '0'
  };

  // The user is refreshed once each time the Profile tab BECOMES focused, not on every state event while it stays focused: each
  // refresh replaces the session object, and the controllers that depend on it register their socket listeners again. The first
  // state event with the tab in front (the one that follows its mount) is the entering.
  const wasFocused = React.useRef(false);
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const isProfileRoute = focusedTab() === 'Profile'
      const entering = isProfileRoute && !wasFocused.current
      wasFocused.current = isProfileRoute
      entering && user?.id && refreshUserInfo()
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaContainerLayout>
      <ProfileController {...profileProps} />
    </SafeAreaContainerLayout>
  );
};

export default Profile;
