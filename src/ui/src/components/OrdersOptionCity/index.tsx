import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { MainSearch as MainSearchController, useLanguage } from '@components'
import { Icon, OButton, OSelect } from '../shared'
import { filterStyles } from '../OrdersOption/styles'

/** The city filter of the orders search: the app's select (a sheet) and a button to clear it. */
export const OrdersOptionCityUI = (props: any) => {
  const {
    search,
    onSearch,
    allListValues
  } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => filterStyles(theme), [theme])

  const options = useMemo(() => {
    const cities: Array<{ value: any, label: string }> = []
    for (const country of allListValues?.countries ?? []) {
      for (const city of country?.cities ?? []) {
        cities.push({ value: city.id, label: city.name })
      }
    }
    return cities
  }, [allListValues?.countries])

  const handleClear = () => {
    onSearch({ ...search, city: '', cityName: '' })
  }

  return (
    <View style={styles.row}>
      <OSelect
        style={styles.select}
        title={t('SELECT_CITY', 'Select City')}
        placeholder={t('SELECT_CITY', 'Select City')}
        options={options}
        value={search?.city}
        onSelect={(value: any, option: any) => onSearch({ ...search, city: value, cityName: option?.label ?? '' })}
        testID='orders-city-select'
      />
      {!!search?.city && (
        <OButton
          iconOnly
          color='neutral'
          appearance='ghost'
          icon={<Icon name='close' />}
          onClick={handleClear}
          accessibilityLabel={t('CLEAR', 'Clear')}
          testID='orders-city-clear'
        />
      )}
    </View>
  )
}

export const OrdersOptionCity = (props: any) => {
  const ordersOptionCityProps = {
    ...props,
    UIComponent: OrdersOptionCityUI
  }
  return <MainSearchController {...ordersOptionCityProps} />
}
