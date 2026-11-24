import React, { useEffect, useState } from 'react';
import { ProfileRow } from '../UserProfileForm/ProfileRow';
import { RowsCard } from '../UserProfileForm/RowsCard';
import { useConfirm } from '../shared';
import { _retrieveStoreData, _clearStoreData } from '../../providers/StoreUtil';
import { LogoutAction, useLanguage, useSession, ToastType, useToast } from '@components';

/**
 * Log out, a row of its own under the profile's lists (decision D7): the app's list row in its danger
 * look, with the logout glyph, in the same card as the other rows. It opens nothing, so it ends
 * without a chevron. It ends the session (the driver signs in again, with the server's rules for it),
 * so it asks first, with the accept button named "Logout".
 */
const LogoutButtonUI = (props: any) => {
  const { handleLogoutClick, setRootState, formState } = props;
  const [, t] = useLanguage();
  const [, { showToast }] = useToast()
  const confirm = useConfirm()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const data = await _retrieveStoreData('notification_state');
    const res = await handleLogoutClick(data);
    setLoading(false)
    if (res) {
      _clearStoreData({ excludedKeys: ['isTutorial', 'language'] });
      setRootState && setRootState({ isAuth: false, token: null })
    }
  };

  useEffect(() => {
    if (formState?.result?.error) {
      showToast(ToastType.Error, formState?.result?.result)
    }
  }, [formState?.result])

  return (
    <RowsCard>
      <ProfileRow
        title={t('LOGOUT', 'Logout')}
        icon='log-out-outline'
        danger
        chevron={false}
        onPress={() => confirm({
          message: t('QUESTION_LOGOUT', 'Are you sure that you want to log out?'),
          acceptText: t('LOGOUT', 'Logout'),
          destructive: true,
          onAccept: handleClick
        })}
        disabled={loading}
        testID='logout'
      />
    </RowsCard>
  );
};

export const LogoutButton = (props: any) => {
  const [{ user }] = useSession()
  const logoutProps = {
    ...props,
    isNative: true,
    isDriverApp: user?.level === 4,
    UIComponent: LogoutButtonUI,
  };

  return <LogoutAction {...logoutProps} />;
};
