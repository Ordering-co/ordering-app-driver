import React, { useMemo } from 'react'
import { ScrollView, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useLanguage } from '@components'
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible'
import { themeBottomSpace, themePart } from '@/theme/helpers'
import { FilterChip, Icon, KeyboardScreen, OButton, OInput, OText } from '../shared'
import { OrdersOptionCity } from '../OrdersOptionCity'
import { OrdersOptionDate } from '../OrdersOptionDate'
import { ChipRow } from './ChipRow'
import { timeStateOf } from '../shared/orderStates'
import { searchFormStyles } from './styles'

interface Props {
  search: any
  onSearch: (search: any) => void
  /** Sends the filters. */
  onApply: () => void
  /** Resets the form and the filter. */
  onClear: () => void
  /** The SLA filter exists on the enterprise plan only. */
  showSla: boolean
  /** What the city's controller takes (the orders controller's own props). */
  cityProps: any
}

/** The time states the search filters by (`order.time_status`), in the order the card's timer colors them. */
const SLA_STATES = ['in_time', 'at_risk', 'delayed']

/**
 * The body of the orders search: the order number, the external id, the date and the SLA as chips, and
 * the city as the app's select, each under its label, and under them, pinned, the two actions.
 * It is drawn inside the search's modal, so the system insets it reads are the modal's own, and the keyboard
 * lifts the whole form (the actions stay in sight).
 */
export const OrdersSearchForm = ({ search, onSearch, onApply, onClear, showSla, cityProps }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const insets = useSafeAreaInsets()
  // As the app's bottom bar: with the keyboard up (it covers the home indicator) the actions keep only their own
  // padding; with it down they clear the inset.
  const keyboardUp = useKeyboardVisible()
  const styles = useMemo(
    () => searchFormStyles(theme, keyboardUp ? 0 : themeBottomSpace(theme, insets.bottom)),
    [theme, insets.bottom, keyboardUp]
  )
  // A theme that puts the label over the field has the field draw it (from its placeholder).
  const fieldLabel = themePart(theme, 'field', 'base.label_position') !== 'above'

  const slaNames: { [key: string]: string } = {
    in_time: t('OK', 'Ok'),
    at_risk: t('AT_RISK', 'At Risk'),
    delayed: t('DELAYED', 'Delayed')
  }

  /** A field of the form, its label over it. */
  const field = (label: string, children: React.ReactNode, showLabel = true) => (
    <View style={styles.field}>
      {showLabel && <OText preset='label'>{label}</OText>}
      {children}
    </View>
  )

  // A field of the form offers its clear button once it has a text (as a select does once it has a value).
  const clearButton = (testID: string, onClick: () => void) => (
    <OButton
      iconOnly
      size='sm'
      color='neutral'
      appearance='ghost'
      icon={<Icon name='close' size='sm' />}
      onClick={onClick}
      accessibilityLabel={t('CLEAR', 'Clear')}
      testID={testID}
    />
  )

  return (
    // Rides above the keyboard: the modal's window is not resized by the system on either platform, so
    // without this "Search" and "Clear search" stayed fully behind it. `padding` on both, as the app's sheets:
    // a modal is a window of its own whose frame starts at the screen's top.
    <KeyboardScreen style={styles.page} behavior='padding' testID='orders-search-form'>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
        nestedScrollEnabled={true}
      >
        {field(t('ORDER_NUMBER', 'Order number'), (
          <OInput
            value={search.id}
            isValueSync
            onChange={(value: any) => onSearch({ ...search, id: value })}
            placeholder={t('ORDER_NUMBER', 'Order number')}
            autoCorrect={false}
            iconCustomRight={search.id ? clearButton('orders-search-id-clear', () => onSearch({ ...search, id: '' })) : undefined}
          />
        ), fieldLabel)}
        {field(t('EXTERNAL_ID', 'External id'), (
          <OInput
            value={search.external_id}
            isValueSync
            onChange={(value: any) => onSearch({ ...search, external_id: value })}
            placeholder={t('EXTERNAL_ID', 'External id')}
            autoCorrect={false}
            iconCustomRight={search.external_id ? clearButton('orders-search-external-clear', () => onSearch({ ...search, external_id: '' })) : undefined}
          />
        ), fieldLabel)}
        {field(t('DATE', 'Date'), <OrdersOptionDate search={search} onSearch={onSearch} />)}
        {field(t('CITY', 'City'), <OrdersOptionCity {...cityProps} search={search} onSearch={onSearch} />)}
        {showSla && field(t('SLA', 'SLA\'s'), (
          <ChipRow testID='orders-sla-chips'>
            {SLA_STATES.map((state) => (
              <FilterChip
                key={state}
                size='md'
                text={slaNames[state]}
                // The time state's dot, in its state's color (decision D4).
                leading={<Icon name='ellipse' size='sm' color={timeStateOf(state) as string} />}
                selected={search.timeStatus === state}
                onPress={() => onSearch({ ...search, timeStatus: search.timeStatus === state ? '' : state })}
                testID={`orders-sla-${state}`}
              />
            ))}
          </ChipRow>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <OButton text={t('SEARCH', 'Search')} size='lg' onClick={onApply} />
        <OButton text={t('CLEAR_SEARCH', 'Clear search')} size='lg' color='neutral' appearance='outline' onClick={onClear} />
      </View>
    </KeyboardScreen>
  )
}
