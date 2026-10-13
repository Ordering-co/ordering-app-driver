import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Container } from './styles';

import { MainSearch as MainSearchController, useLanguage } from '@components'
import ODropDown from '../shared/ODropDown';

export const OrdersOptionCityUI = (props: any) => {
  const {
    search,
    onSearch,
    allListValues,
    setOpenedSelect,
    openedSelect
  } = props

  const theme = useTheme();
  const [, t] = useLanguage();
  const [optionsList, setOptionsList] = useState<any[]>([])

  useEffect(() => {
    const cities: any = []
    for (const country of allListValues?.countries) {
      for (const city of country.cities) {
        cities.push({value: city.id, content: city.name})
      }
    }
    setOptionsList(cities)
  }, [allListValues?.countries])

  const handleClear = () => {
    onSearch({ ...search, city: '', cityName: '' })
  }

  const handleOpenSelect = () => {
    setOpenedSelect('city')
  }

  return (
    <Container isIos={Platform.OS === 'ios'}>
      <ODropDown
        options={optionsList}
        defaultValue={search.city}
        onSelect={(option: any) => {
          const selectedCity = optionsList.find((city: any) => city.value === option)
          onSearch({ ...search, city: option, cityName: selectedCity?.content ?? '' })
        }}
        isModal
        bgcolor={theme.colors.inputDisabled}
        textcolor={theme.colors.unselectText}
        placeholder={t('SELECT_CITY', 'Select City')}
        dropViewMaxHeight={200}
        handleClear={handleClear}
        handleOpenSelect={handleOpenSelect}
        openedSelect={openedSelect}
        selectType='city'
      />
    </Container>
  );
};

export const OrdersOptionCity = (props: any) => {
  const ordersOptionCityProps = {
    ...props,
    UIComponent: OrdersOptionCityUI
  };
  return <MainSearchController {...ordersOptionCityProps} />;
};
