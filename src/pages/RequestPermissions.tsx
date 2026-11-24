import React, { useContext, useEffect, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openSettings } from 'react-native-permissions';
import { PermissionsContext } from '../context/PermissionsContext';
import { locationPermissionRows } from '../context/locationPermissionRows';

import {
  FloatingButton,
  Icon,
  OText
} from '@ui';
import { useLanguage } from '@components';
import {
  bottomBarClearance,
  themeColor,
  themeGutter,
  themePart,
  themeRadius,
  themeSpace
} from '@/theme/helpers';

/**
 * The screen the Map tab shows (and a stack screen) while the location is not granted: what is
 * needed and why, the permissions the device has and has not granted, and the bottom bar's button
 * that opens the system's settings. The explanation is the platform's own text; when the
 * permissions are granted the screen leaves.
 */
const RequestPermissions = ({ navigation }: any) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [, t] = useLanguage();
  const { isGrantedPermissions, permissions, getPermissions } = useContext(PermissionsContext);

  // The message, centered in the room the bottom bar leaves; a long one scrolls.
  const styles = useMemo(() => StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: themeColor(theme, 'background'),
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: themeSpace(theme, 'lg'),
      paddingTop: insets.top,
      paddingHorizontal: themeGutter(theme),
      paddingBottom: bottomBarClearance(theme, insets.bottom),
    },
    // The glyph centered in a round tint of the brand, `empty_state.base.icon_box_size` across.
    badge: {
      width: themePart(theme, 'empty_state', 'base.icon_box_size'),
      height: themePart(theme, 'empty_state', 'base.icon_box_size'),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: themeRadius(theme, 'full', { fixed: true }),
      backgroundColor: themeColor(theme, 'primary_subtle'),
    },
    list: { alignSelf: 'stretch', gap: themeSpace(theme, 'sm') },
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
  }), [theme, insets.top, insets.bottom]);

  const contentKey = Platform.OS === 'ios'
    ? 'DRIVER_PERMISSIONS_ERROR_IOS'
    : 'DRIVER_PERMISSIONS_ERROR'

  const contentText = Platform.OS === 'ios'
    ? 'You must grant the background location permission for the use of this app, please grant permission and restart the app.'
    : `This app require access to your device location (real time location provided by Google) and physical activity, those are needed to allow the customers to track your current location as a driver while working on his order, the physical activity is to optimize the battery to only track you while you’re moving in your route.\n
    This track will be used on background and the shared location will be finished for the customer once the order is delivered to him.\n
    Features used in background: Google maps real time GPS tracking.`

  // Each permission this device asks for, granted or not, as the system last told the app.
  const rows = locationPermissionRows(t, getPermissions?.() ?? [], permissions?.locationStatus)

  const handleOpenSettings = () => {
    openSettings().catch(() => console.warn('cannot open settings'));
  };

  // A stack screen leaves when the permissions are granted. As the Map tab's screen it does not: the tab swaps it for the map,
  // and going back from a tab would send the driver to another tab.
  useEffect(() => {
    if (isGrantedPermissions && navigation.getState?.()?.type !== 'tab') {
      navigation.goBack()
    }
  }, [isGrantedPermissions])

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Icon name='location-outline' size={themePart(theme, 'empty_state', 'base.icon_size')} color='primary_text' />
        </View>
        <OText preset='h3' align='center' testID='permissions-title'>
          {t('LOCATION_IS_NEEDED', 'Location is needed')}
        </OText>
        <OText preset='body_lg' color='text_muted' align='center' testID='permissions-text'>
          {t(contentKey, contentText)}
        </OText>
        {rows.length > 0 && (
          <View style={styles.list} testID='permissions-list'>
            {rows.map((row) => (
              <View
                key={row.permission}
                style={styles.row}
                accessible
                accessibilityLabel={`${row.label}: ${row.granted ? t('PERMISSION_GRANTED', 'Granted') : t('PERMISSION_NOT_GRANTED', 'Not granted')}`}
              >
                <Icon
                  name={row.granted ? 'checkmark' : 'close'}
                  color={row.granted ? 'success_text' : 'danger_text'}
                  testID={row.granted ? 'permission-granted' : 'permission-missing'}
                />
                <OText preset={row.granted ? 'body' : 'label'}>{row.label}</OText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <FloatingButton
        btnText={t('GO_TO_SETTINGS', 'Go to settings')}
        firstButtonClick={handleOpenSettings}
        isPadding
      />
    </View>
  );
};

export default RequestPermissions;
