import React, { useEffect, useMemo, useState } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import dayjs, { type Dayjs } from '@/utils/dayjs'
import { useLanguage } from '@components'
import OText from './OText'
import Icon from './Icon'
import { themeColor, themeControlHeight, themeRadius, themeSpace, themeText } from '@/theme/helpers'

/**
 * A month calendar to pick one day, the app's own (in place of
 * react-native-calendar-picker, whose last version needs date-fns and whose
 * install script set up git hooks): the month with its arrows, the week's days
 * and a grid of days, each in a cell as tall as a touch target (`md`). The selected day is painted as the delivery-time strip's
 * (`components.date_strip`), today on `border`; a day before `minDate` is
 * disabled. The calendar takes the width its container gives it (or `width`), the columns share
 * it, and a weekday name is one line. Months and days are named in the app's language (its `MONTH1`…
 * and `DAYSHORT1`… texts), never in a library's global locale, which depends on
 * the screens visited before. A day's circle is never wider than its column
 * (a 320 pt screen leaves columns narrower than the control's height).
 */
type OCalendarProps = {
  selectedDate?: Date | string | null
  minDate?: Date
  maxDate?: Date
  onDateChange: (date: Date) => void
  width?: number
  testID?: string
}

const DAYS_IN_WEEK = 7
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// Sunday first, as the grid: the app's `DAYSHORT7` is Sunday.
const WEEKDAYS: Array<[string, string]> = [
  ['DAYSHORT7', 'Sun'], ['DAYSHORT1', 'Mon'], ['DAYSHORT2', 'Tue'], ['DAYSHORT3', 'Wed'], ['DAYSHORT4', 'Thu'], ['DAYSHORT5', 'Fri'], ['DAYSHORT6', 'Sat'],
]

export const OCalendar = ({ selectedDate, minDate, maxDate, onDateChange, width, testID = 'calendar-picker' }: OCalendarProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  // The width the columns share: the caller's, or the one the calendar is laid out with.
  const [measured, setMeasured] = useState<number | undefined>(undefined)
  const selected = selectedDate ? dayjs(selectedDate) : null
  const [month, setMonth] = useState(() => (selected ?? dayjs()).clone().startOf('month'))

  useEffect(() => {
    if (selected && !selected.isSame(month, 'month')) setMonth(selected.clone().startOf('month'))
  }, [selectedDate])

  const looks = useMemo(() => {
    const strip = theme.native.components.date_strip.base
    // The day's circle is the `sm` control; the day's cell (what answers a tap) is the touch target, `md`.
    const cell = themeControlHeight(theme, 'sm')
    const touch = themeControlHeight(theme, 'md')
    const available = width ?? measured
    // The circle fits its column: the control's height, or the column's width when narrower.
    const circle = available ? Math.min(cell, Math.floor(available / DAYS_IN_WEEK)) : cell
    return StyleSheet.create({
      // The caller's width, or the whole width its container gives (never shrunk to the content: the
      // seven columns would share about 160 pt of a phone and wrap the weekday names).
      container: width === undefined ? { alignSelf: 'stretch' } : { alignSelf: 'center', width },
      header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: themeSpace(theme, 'sm') },
      title: { ...themeText(theme, 'body', { weight: 600 }), color: themeColor(theme, 'text') },
      row: { flexDirection: 'row' },
      cell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: cell, marginVertical: themeSpace(theme, 'xxs') },
      dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: touch, marginVertical: themeSpace(theme, 'xxs') },
      day: { width: circle, height: circle, borderRadius: themeRadius(theme, 'full', { fixed: true }), alignItems: 'center', justifyContent: 'center' },
      today: { backgroundColor: themeColor(theme, 'border') },
      selected: { backgroundColor: strip.selected_background },
      weekday: { ...themeText(theme, 'body_sm'), color: themeColor(theme, 'text_muted') },
      dayText: { ...themeText(theme, 'body_sm'), color: themeColor(theme, 'text') },
      selectedText: { color: strip.selected_color },
      disabledText: { color: themeColor(theme, 'text_disabled') },
    })
  }, [theme, width, measured])

  const monthName = (date: Dayjs) => t(`MONTH${date.month() + 1}`, MONTHS[date.month()])
  const onLayout = (event: LayoutChangeEvent) => {
    const laidOut = Math.round(event.nativeEvent.layout.width)
    if (width === undefined && laidOut !== measured) setMeasured(laidOut)
  }

  const weeks = useMemo(() => {
    const first = month.clone().startOf('month')
    const days: (Dayjs | null)[] = Array.from({ length: first.day() }, () => null)
    for (let d = 0; d < month.daysInMonth(); d++) days.push(first.clone().add(d, 'day'))
    while (days.length % DAYS_IN_WEEK) days.push(null)
    return Array.from({ length: days.length / DAYS_IN_WEEK }, (_, w) => days.slice(w * DAYS_IN_WEEK, (w + 1) * DAYS_IN_WEEK))
  }, [month])

  const isDisabled = (day: Dayjs) =>
    (!!minDate && day.isBefore(dayjs(minDate), 'day')) || (!!maxDate && day.isAfter(dayjs(maxDate), 'day'))

  const canGoBack = !minDate || month.isAfter(dayjs(minDate), 'month')
  const canGoForward = !maxDate || month.isBefore(dayjs(maxDate), 'month')

  return (
    <View style={looks.container} testID={testID} onLayout={onLayout}>
      <View style={looks.header}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={t('PREVIOUS_MONTH', 'Previous month')}
          disabled={!canGoBack}
          onPress={() => setMonth(month.clone().subtract(1, 'month'))}
          hitSlop={themeSpace(theme, 'sm')}
        >
          <Icon name='chevron-back' size='lg' color={canGoBack ? 'text_muted' : 'text_disabled'} />
        </Pressable>
        <OText style={looks.title}>{`${monthName(month)} ${month.year()}`}</OText>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={t('NEXT_MONTH', 'Next month')}
          disabled={!canGoForward}
          onPress={() => setMonth(month.clone().add(1, 'month'))}
          hitSlop={themeSpace(theme, 'sm')}
        >
          <Icon name='chevron-forward' size='lg' color={canGoForward ? 'text_muted' : 'text_disabled'} />
        </Pressable>
      </View>
      <View style={looks.row}>
        {WEEKDAYS.map(([key, name]) => (
          <View key={key} style={looks.cell}>
            <OText style={looks.weekday} numberOfLines={1}>{t(key, name)}</OText>
          </View>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={looks.row}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={looks.dayCell} />
            const disabled = isDisabled(day)
            const on = !!selected && day.isSame(selected, 'day')
            const today = day.isSame(dayjs(), 'day')
            return (
              <Pressable
                key={d}
                style={looks.dayCell}
                disabled={disabled}
                onPress={() => onDateChange(day.toDate())}
                accessibilityRole='button'
                accessibilityState={{ selected: on, disabled }}
                accessibilityLabel={`${day.date()} ${monthName(day)} ${day.year()}`}
              >
                <View style={[looks.day, today && looks.today, on && looks.selected]}>
                  <OText style={[looks.dayText, on && looks.selectedText, disabled && looks.disabledText]}>
                    {day.date()}
                  </OText>
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

export default OCalendar
