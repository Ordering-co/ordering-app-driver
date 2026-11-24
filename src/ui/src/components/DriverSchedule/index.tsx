import React, { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLanguage, useSession, useUtils } from '@components'
import { OBadge, OListRow, ONavbar, OText } from '../shared'
import { CardRow, RowsCard } from '../UserProfileForm/RowsCard'
import { allDayWeek, dayLapses } from './hours'
import { themeColor, themeGutter, themePart } from '@/theme/helpers'

// The weekday's whole name, as the project's date utility writes it (in the app's language).
const WEEKDAY_NAME = 'dddd'

/** The rows of the list: today and the six days after it. */
const DAYS_SHOWN = 7

/**
 * The driver's week, a screen of the account (opened from the profile's Schedule row): the bar says
 * the day it is (its weekday and its date, the project's format) and a card holds one row per day
 * (`components.list_row`: the day, its date and its hours, or "Not available"). The list starts at
 * today and runs seven days (today, tomorrow, ...), dates ascending: row k is the date `today + k`
 * and shows the schedule's weekday `(today + k) % 7`, so "Today" is always the first row, tinted and
 * wearing a "Today" badge. Dates are in the project's date format and hours in its time format
 * (`useUtils`), never in one of this screen's.
 */
export const DriverSchedule = (props: any) => {
  const { schedule, navigation } = props
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [, { refreshUserInfo }] = useSession()
  const [utils] = useUtils()
  const { parseDate, dateFormat } = utils
  const insets = useSafeAreaInsets()
  const [refreshing] = useState(false)

  const page = themePart(theme, 'account_page', 'base')
  // Today's tint, the same the card's row carries at its sides: the list row paints its own fill over
  // it, so the row takes the tint too and the whole band is tinted.
  const todayTint = themeColor(theme, 'primary_subtle')
  const styles = useMemo(() => StyleSheet.create({
    page: { flex: 1 },
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: page.padding_bottom + insets.bottom },
    hours: { alignItems: 'flex-end' },
  }), [theme, page.padding_bottom, insets.bottom])
  // The pull-to-refresh spinner in the theme's spinner color (iOS `tintColor`, Android `colors`).
  const refreshColor = themePart(theme, 'spinner', 'base.color')
  const refreshColors = useMemo(() => [refreshColor], [refreshColor])

  const daysOfWeek = [
    t('SUNDAY_ABBREVIATION', 'Sun'),
    t('MONDAY_ABBREVIATION', 'Mon'),
    t('TUESDAY_ABBREVIATION', 'Tues'),
    t('WEDNESDAY_ABBREVIATION', 'Wed'),
    t('THURSDAY_ABBREVIATION', 'Thur'),
    t('FRIDAY_ABBREVIATION', 'Fri'),
    t('SATURDAY_ABBREVIATION', 'Sat')
  ]

  // A date without its time, in the project's format.
  const writeDate = (date: Date) => parseDate(date, { outputFormat: dateFormat })
  const today = new Date()
  const week = schedule ?? allDayWeek()
  // The week as the screen lists it: row k is `today + k` days (by the calendar, so a daylight-saving
  // change moves no row) with the schedule of that date's weekday (the schedule is indexed from Sunday).
  const days = Array.from({ length: DAYS_SHOWN }, (_, k) => {
    const date = new Date(today)
    date.setDate(today.getDate() + k)
    const weekday = date.getDay()
    return { k, weekday, date, item: week[weekday] }
  })

  return (
    <View style={styles.page}>
      <ONavbar
        title={t('SCHEDULE', 'Schedule')}
        subtitle={`${parseDate(today, { outputFormat: WEEKDAY_NAME })}, ${writeDate(today)}`}
        onBack={() => navigation?.canGoBack?.() && navigation.goBack()}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl
          refreshing={refreshing}
          onRefresh={() => refreshUserInfo()}
          tintColor={refreshColor}
          colors={refreshColors}
        />}
      >
        <RowsCard testID='schedule-days'>
          {days.map(({ k, weekday, date, item }) => {
            const isToday = k === 0
            return (
              <CardRow key={daysOfWeek[weekday]} highlighted={isToday} testID={isToday ? 'schedule-today' : undefined}>
                <OListRow
                  last
                  background={isToday ? todayTint : undefined}
                  testID={`schedule-row-${k}`}
                  tall={isToday}
                  title={daysOfWeek[weekday]}
                  titleEnd={isToday ? <OBadge testID='schedule-today-badge'>{t('TODAY', 'Today')}</OBadge> : undefined}
                  subtitle={writeDate(date)}
                  trailing={(
                    <View style={styles.hours}>
                      {item?.enabled ? (
                        dayLapses(item, utils).map((lapse, index) => (
                          <OText key={`${daysOfWeek[weekday]}_${index}`} weight={isToday ? 600 : undefined}>{lapse}</OText>
                        ))
                      ) : (
                        <OText color='danger_text'>{t('NOT_AVAILABLE', 'Not available')}</OText>
                      )}
                    </View>
                  )}
                />
              </CardRow>
            )
          })}
        </RowsCard>
      </ScrollView>
    </View>
  )
}
