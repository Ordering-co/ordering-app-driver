import React, { useEffect, useMemo } from 'react';
import { useTheme } from 'styled-components/native';
import { StyleSheet, View } from 'react-native';
import { openSettings, checkNotifications } from 'react-native-permissions';

import { OBottomPopup, OButton, OText } from '../shared';
import { useLanguage } from '@components'
import { themeSpace } from '@/theme/helpers';

interface NotificationSettingPropsParams {
  checkNotificationStatus: { open: boolean, checked: boolean };
  setCheckNotificationStatus: (notificationStatus: any) => void;
}
export const NotificationSetting = (props: NotificationSettingPropsParams) => {
  const { checkNotificationStatus, setCheckNotificationStatus } = props
  const theme: any = useTheme();
  const [, t] = useLanguage();
  // The sheet owns its sides and bottom (`OBottomPopup padded`): only the space between its pieces is here.
  const styles = useMemo(() => StyleSheet.create({
    body: { gap: themeSpace(theme, 'lg') }
  }), [theme]);

  const requestLocationPermission = async () => {
    const notificationStatus = await checkNotifications()
    if (notificationStatus?.status === 'blocked') {
      setCheckNotificationStatus({ open: true, checked: false })
      return
    }
    setCheckNotificationStatus({ open: false, checked: true })
  };

  const callOpenSettings = () => {
    openSettings().catch(() => console.warn('cannot open settings'));
    setCheckNotificationStatus({ open: false, checked: true })
  }

  useEffect(() => {
    requestLocationPermission()
  }, [])
  return (
    <OBottomPopup
      open={checkNotificationStatus?.open}
      onClose={() => setCheckNotificationStatus({ open: false, checked: true })}
      title={t('ENABLE_NOTIFICATIONS', 'Enable notifications')}
      padded
    >
      <View style={styles.body} testID='notification-setting-body'>
        <OText>
          {t('ACTIVE_NOTIFICATION_TO_RECEIVE_INFORMATION', 'Activate notifications to receive information about your orders')}
        </OText>
        <OButton
          text={t('ENABLE_NOTIFICATIONS', 'Enable notifications')}
          onClick={() => callOpenSettings()}
        />
      </View>
    </OBottomPopup>
  );
};
