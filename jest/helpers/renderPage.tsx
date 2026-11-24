import React from 'react'
import { RenderOptions } from '@testing-library/react-native'
import { renderWithProviders } from './renderWithProviders'

type NavigationStub = {
  navigate: jest.Mock
  reset: jest.Mock
  goBack: jest.Mock
  canGoBack: jest.Mock
  dispatch: jest.Mock
  replace: jest.Mock
}

type RenderPageOptions = Omit<RenderOptions, 'wrapper'> & {
  route?: { params?: Record<string, unknown> }
  navigation?: Partial<NavigationStub>
  pageProps?: Record<string, unknown>
}

export const createNavigationStub = (
  overrides: Partial<NavigationStub> = {}
): NavigationStub => ({
  navigate: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  dispatch: jest.fn(),
  replace: jest.fn(),
  ...overrides
})

export const renderPage = (
  Page: React.ComponentType<any>,
  {
    route = { params: {} },
    navigation,
    pageProps = {},
    ...options
  }: RenderPageOptions = {}
) => {
  const navigationStub = createNavigationStub(navigation)
  const result = renderWithProviders(
    <Page navigation={navigationStub} route={route} {...pageProps} />,
    options
  )
  return { ...result, navigation: navigationStub, route }
}
