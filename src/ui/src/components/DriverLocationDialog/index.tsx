import React from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { OButton, OModal, OText } from '../shared'
import { actionsStyles } from './styles'

export type DriverLocationDialogKind = 'services_disabled' | 'authorization_changed' | 'always_required'

interface Props {
  /** Why tracking cannot run; null while there is nothing to say. */
  kind: DriverLocationDialogKind | null
  onClose: () => void
  /** Opens the system settings where the driver turns the location on. */
  onOpenSettings: () => void
  testID?: string
}

/**
 * The dialog of the driver location module: location services are off, the permission
 * was lost, or (iOS) the driver allowed the location only while the app is in use and tracking
 * needs "Always". The modal's box (`OModal box`) with the reason, a button to the system settings
 * and one to leave it as it is. The first two texts are the ones the tracking SDK's alert carried.
 */
export const DriverLocationDialog = ({ kind, onClose, onOpenSettings, testID }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = React.useMemo(() => actionsStyles(theme), [theme])
  const title = kind === 'services_disabled'
    ? t('MOBILE_LOCATION_OFF', 'Mobile location off')
    : kind === 'always_required'
      ? t('MOBILE_LOCATION_ALWAYS_REQUIRED', 'Location access must be "Always"')
      : t('MOBILE_LOCATION_NOT_ENABLED', 'Mobile location not enabled')
  const reason = kind === 'always_required'
    ? t('MOBILE_LOCATION_ALWAYS_REQUIRED_DESC', 'Your orders are not being tracked. Open Settings, tap Location and choose "Always".')
    : t('MOBILE_LOCATION_NOT_ENABLED_DESC', 'Enable location for tracking your orders')

  return (
    <OModal open={!!kind} onClose={onClose} isTransparent box title={title} testID={testID}>
      <OText>{reason}</OText>
      <View style={styles.actions}>
        <View style={styles.action}>
          <OButton
            testID={testID ? `${testID}-cancel` : undefined}
            text={t('CANCEL', 'Cancel')}
            color='neutral'
            onClick={onClose}
          />
        </View>
        <View style={styles.action}>
          <OButton
            testID={testID ? `${testID}-settings` : undefined}
            text={t('MOBILE_IOS_SETTINGS', 'Open Settings')}
            onClick={onOpenSettings}
          />
        </View>
      </View>
    </OModal>
  )
}
