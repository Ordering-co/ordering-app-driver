import React from 'react'
import { render, RenderOptions } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from 'styled-components/native'
import { defaultAppTheme } from '../../src/theme/engine'

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  themeOverrides?: Record<string, unknown>
}

export const renderWithProviders = (
  ui: React.ReactElement,
  { themeOverrides, ...options }: RenderWithProvidersOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SafeAreaProvider>
      <ThemeProvider theme={{ ...defaultAppTheme(), ...themeOverrides }}>
        {children}
      </ThemeProvider>
    </SafeAreaProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}
