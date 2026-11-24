import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage, useSession, useUtils } from '@components'
import { OCard, ONavbar, OText } from '../shared'
import { FloatingButton } from '../FloatingButton'
import { NotFoundSource } from '../NotFoundSource'
import { formatHours } from '../../utils'
import { themeColor, themeGutter, themeImage, themeSpace } from '@/theme/helpers'

/**
 * The screen of a driver outside the schedule: the app's empty state
 * (`components.empty_state`) with the theme's `empty.schedule_blocked` image and its message, the next
 * time the driver can log in in a tinted box (its hour in the project's time format), and the way out
 * in the app's bottom bar (it logs out).
 */
export const ScheduleBlocked = (props: any) => {
  const { nextSchedule } = props
  const [, t] = useLanguage()
  const [, { logout }] = useSession()
  const [utils] = useUtils()
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    page: { flex: 1 },
    // The empty state sits on the page gutter, in the middle of what the bar leaves; the bar carries its own.
    body: { flex: 1, justifyContent: 'center', paddingHorizontal: themeGutter(theme) },
    // The tinted box is `md` high on its sides' `lg` (the mockup's 15 over 20), its two lines centered.
    next: { marginTop: themeSpace(theme, 'lg'), paddingHorizontal: themeSpace(theme, 'lg'), alignItems: 'center', gap: themeSpace(theme, 'xxs') },
  }), [theme])
  // The next time is a box tinted with the brand's light color: no border, no shadow.
  const tint = useMemo(() => ({
    background: themeColor(theme, 'primary_subtle'),
    border: null,
    shadow: null,
    padding: themeSpace(theme, 'md')
  }), [theme])

  const daysOfWeek = [
    t('SUNDAY', 'Sunday'),
    t('MONDAY', 'Monday'),
    t('TUESDAY', 'Tuesday'),
    t('WEDNESDAY', 'Wednesday'),
    t('THURSDAY', 'Thursday'),
    t('FRIDAY', 'Friday'),
    t('SATURDAY', 'Saturday'),
  ]

  const goBack = () => {
    logout()
  }

  // A driver with no day to come back on has no next time to show.
  const hasNext = nextSchedule?.day !== null && nextSchedule?.day !== undefined

  return (
    <View style={styles.page}>
      <ONavbar title={t('YOU_CANT_LOGIN', 'You can\'t login')} />
      <View style={styles.body}>
        <NotFoundSource
          image={themeImage(theme, 'empty.schedule_blocked')}
          content={t('OUTSIDE_ESTABLISHED_SCHEDULE', 'You are outside the established schedule')}
        >
          {hasNext && (
            <OCard look={tint} style={styles.next} testID='schedule-next'>
              <OText preset='body_sm'>{t('NEXT_TIME', 'Next time')}</OText>
              <OText preset='h4'>{`${daysOfWeek[nextSchedule.day]} ${formatHours(nextSchedule?.schedule?.open, utils)}`}</OText>
            </OCard>
          )}
        </NotFoundSource>
      </View>
      <FloatingButton
        inline
        isPadding
        testID='schedule-blocked-bar'
        buttonTestID='schedule-blocked-back'
        btnText={t('GO_BACK', 'Go back')}
        firstButtonClick={goBack}
      />
    </View>
  )
}
