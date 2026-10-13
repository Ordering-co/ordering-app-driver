import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useApi } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { Home } from '..'

const title = { key: 'LETS_START_TO_SEE_YOUR_ORDERS', value: "Let's start to see your orders" }

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useApi as jest.Mock).mockReturnValue([
      { project: 'demo' },
      { setOrdering: jest.fn() }
    ])
  })

  it('renders welcome copy and navigates to login', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <Home
        onNavigationRedirect={onNavigationRedirect}
        useRootPoint={false}
        title={title}
      />
    )
    expect(getByText('Manage your business')).toBeTruthy()
    expect(getByText("Let's start to see your orders")).toBeTruthy()
    fireEvent.press(getByText('Login'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('Login')
  })

  it('shows project input when useRootPoint is enabled', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <Home
        useRootPoint
        onNavigationRedirect={jest.fn()}
        title={title}
      />
    )
    expect(getByPlaceholderText('Project Name')).toBeTruthy()
    expect(getByText('Set project')).toBeTruthy()
  })

  it('submits project name and redirects after ordering updates', async () => {
    const onNavigationRedirect = jest.fn()
    let apiState = { project: null as string | null }
    const setOrdering = jest.fn((next) => {
      apiState = next
    })
    ;(useApi as jest.Mock).mockImplementation(() => [apiState, { setOrdering }])

    const { getByPlaceholderText, getByText, rerender } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={onNavigationRedirect} title={title} />
    )

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Project Name'), 'myproject')
      fireEvent.press(getByText('Set project'))
    })

    await waitFor(() => {
      expect(setOrdering).toHaveBeenCalledWith(expect.objectContaining({ project: 'myproject' }))
    })

    apiState = { project: 'myproject' }
    ;(useApi as jest.Mock).mockImplementation(() => [apiState, { setOrdering }])
    rerender(<Home useRootPoint onNavigationRedirect={onNavigationRedirect} title={title} />)

    await waitFor(() => {
      expect(onNavigationRedirect).toHaveBeenCalledWith('Login')
    })
  })

  it('shows validation error when project name is empty', async () => {
    const { getByText } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={jest.fn()} title={title} />
    )
    fireEvent.press(getByText('Set project'))
    await waitFor(() => {
      expect(getByText('The field project name is required')).toBeTruthy()
    })
  })
})
