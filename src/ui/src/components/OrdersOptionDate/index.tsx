import React, { useState } from 'react'
import dayjs, { parseSearchDay, SEARCH_DAY_FORMAT } from '@/utils/dayjs'

import { useLanguage, useUtils } from '@components'
import { FilterChip, OBottomPopup, OCalendar } from '../shared'
import { ChipRow } from '../OrdersOption/ChipRow'

/** The format the orders search sends its dates in (what `search.date` holds): never what the driver reads. */
const DATE_FORMAT = SEARCH_DAY_FORMAT
const RANGE = 'calendar'

const toDate = (value?: string) => parseSearchDay(value)

/**
 * The date filter of the orders search: a chip for each preset and one for a
 * custom range, which opens the app's calendar in a sheet to pick it (the first
 * day, then the last one; the sheet owns its body's padding: `OBottomPopup padded`).
 * A chip that is selected clears the filter when it is pressed again, and a picked
 * range is the custom chip's text.
 */
export const OrdersOptionDate = (props: any) => {
  const {
    search,
    onSearch
  } = props

  const [, t] = useLanguage()
  const [{ parseDate, dateFormat }] = useUtils()
  /** The end of the range being picked on the calendar; null: the calendar is closed. */
  const [picking, setPicking] = useState<'from' | 'to' | null>(null)

  const { from, to, type } = search.date
  /** A day of the range as the driver reads it: the project's date format. */
  const shown = (value?: string) => value ? parseDate(toDate(value), { outputFormat: dateFormat, utc: false }) : ''
  const presets = [
    { value: 'today', label: t('TODAY', 'Today') },
    { value: 'yesterday', label: t('YESTERDAY', 'Yesterday') },
    { value: 'last_7days', label: t('LAST_7_DAYS', 'Last 7 days') },
    { value: 'last_30days', label: t('LAST_30_DAYS', 'Last 30 days') },
  ]

  const clear = () => onSearch({ ...search, date: { from: '', to: '', type: '' } })

  const handleChangeDate = (date: Date) => {
    const day = dayjs(date).format(DATE_FORMAT)
    if (picking === 'from') {
      onSearch({ ...search, date: { from: day, to: '', type: RANGE } })
      setPicking('to')
    } else {
      onSearch({ ...search, date: { from, to: day, type: RANGE } })
      setPicking(null)
    }
  }

  return (
    <>
      <ChipRow testID='orders-date-chips'>
        {presets.map((preset) => (
          <FilterChip
            key={preset.value}
            size='md'
            text={preset.label}
            selected={type === preset.value}
            onPress={() => type === preset.value ? clear() : onSearch({ ...search, date: { from: '', to: '', type: preset.value } })}
            testID={`orders-date-${preset.value}`}
          />
        ))}
        <FilterChip
          size='md'
          icon='calendar-outline'
          // A picked range is the chip's text: it shows its days.
          text={type === RANGE ? [shown(from), shown(to)].filter(Boolean).join(' ~ ') : t('CUSTOM_RANGE', 'Custom range')}
          selected={type === RANGE}
          onPress={() => type === RANGE ? clear() : setPicking('from')}
          accessibilityLabel={t('CUSTOM_RANGE', 'Custom range')}
          testID='orders-date-range'
        />
      </ChipRow>
      <OBottomPopup
        open={picking !== null}
        onClose={() => setPicking(null)}
        title={picking === 'to' ? t('TO', 'To') : t('FROM', 'From')}
        closeIcon
        animationType='slide'
        padded
      >
        <OCalendar
          selectedDate={picking === 'to' ? toDate(to) ?? toDate(from) : toDate(from)}
          minDate={picking === 'to' ? toDate(from) : undefined}
          onDateChange={handleChangeDate}
          testID='orders-date-calendar'
        />
      </OBottomPopup>
    </>
  )
}
