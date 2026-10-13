import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { SearchBar } from '..'

describe('SearchBar', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('calls onSearch immediately when lazyLoad is disabled', () => {
    const onSearch = jest.fn()
    const { getByPlaceholderText } = renderWithProviders(
      <SearchBar searchValue="" placeholder="Search stores" onSearch={onSearch} />
    )
    fireEvent.changeText(getByPlaceholderText('Search stores'), 'pizza')
    expect(onSearch).toHaveBeenCalledWith('pizza')
  })

  it('debounces search when lazyLoad is enabled', () => {
    const onSearch = jest.fn()
    const { getByPlaceholderText } = renderWithProviders(
      <SearchBar
        searchValue=""
        placeholder="Search"
        onSearch={onSearch}
        lazyLoad
      />
    )
    fireEvent.changeText(getByPlaceholderText('Search'), 'abc')
    expect(onSearch).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onSearch).toHaveBeenCalledWith('abc')
  })

  it('shows cancel button and clears search', () => {
    const onCancel = jest.fn()
    const { getByText } = renderWithProviders(
      <SearchBar
        searchValue="term"
        placeholder="Search"
        onSearch={jest.fn()}
        onCancel={onCancel}
        isCancelButtonShow
      />
    )
    fireEvent.press(getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
