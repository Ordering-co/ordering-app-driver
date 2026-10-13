import React from 'react'
import { render, RenderOptions } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from 'styled-components/native'
import theme from '@/theme.json'

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  themeOverrides?: Record<string, unknown>
}

export const renderWithProviders = (
  ui: React.ReactElement,
  { themeOverrides, ...options }: RenderWithProvidersOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SafeAreaProvider>
      <ThemeProvider theme={{ ...theme, ...themeOverrides }}>
        {children}
      </ThemeProvider>
    </SafeAreaProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}
