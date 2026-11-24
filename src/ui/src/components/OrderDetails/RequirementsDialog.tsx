import React, { useMemo } from 'react'
import { ScrollView, useWindowDimensions } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useLanguage } from '@components'
import { OButton, OModal } from '../shared'
import { ValidationIssuesList } from './ValidationIssuesList'
import { requirementsListStyles } from './styles'

interface Props {
  open: boolean
  /** The location requirements the status change does not meet. */
  issues: any[]
  onClose: () => void
  testID?: string
}

/**
 * The dialog of a status change that does not meet its location requirements
 * (the order's details and the accept / reject screen open the same one): the
 * modal's box (`OModal box`) with the requirements, each with the action that
 * solves it, and a button to close, which has one look whoever opens the
 * dialog. The list scrolls inside the room the window leaves the box.
 */
export const RequirementsDialog = ({ open, issues, onClose, testID }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const { height } = useWindowDimensions()
  const { top, bottom } = useSafeAreaInsets()
  const room = height - top - bottom
  const styles = useMemo(() => requirementsListStyles(theme, room), [theme, room])

  return (
    <OModal
      open={open}
      onClose={onClose}
      isTransparent
      box
      title={t('REQUIREMENTS_NOT_MET', 'Requirements Not Met')}
      testID={testID}
    >
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <ValidationIssuesList issues={issues} showActions />
      </ScrollView>
      <OButton
        text={t('CLOSE', 'Close')}
        color='neutral'
        onClick={onClose}
      />
    </OModal>
  )
}
