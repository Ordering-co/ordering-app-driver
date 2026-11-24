import React from 'react'
import { Text } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'

const mockRoot = { current: 'https://api.example.com/v400/en/demo' as string | undefined }
jest.mock('@components', () => ({ useApi: () => [{ root: mockRoot.current }] }))
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))
jest.mock('../remote', () => ({
  ...jest.requireActual('../remote'),
  fetchTheme: jest.fn(),
  writeCachedTheme: jest.fn(),
}))

import { AppThemeProvider, RemoteThemeLoader, useAppTheme } from '../AppThemeContext'
import { defaultAppTheme, THEME_PRODUCT_TYPE } from '../engine'
import { themeColor } from '../helpers'
import { fetchTheme, writeCachedTheme } from '../remote'

const envelope = (values: any) => ({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const SERVED = '#00AA55'

/** Paints the primary color and keeps every theme object it was rendered with. */
const seen: any[] = []
const Probe = () => {
  const theme = useAppTheme()
  seen.push(theme)
  return <Text testID='primary'>{themeColor(theme, 'primary')}</Text>
}

const app = (initial: any, project: string | null = 'demo') => render(
  <AppThemeProvider initialEnvelope={initial}>
    <RemoteThemeLoader project={project} appId='app-1' />
    <Probe />
  </AppThemeProvider>
)

describe('the theme provider and the served theme', () => {
  beforeEach(() => {
    seen.length = 0
    mockRoot.current = 'https://api.example.com/v400/en/demo'
    ;(fetchTheme as jest.Mock).mockReset()
    ;(writeCachedTheme as jest.Mock).mockReset()
  })

  it('paints the build\'s defaults until a theme is served, then the served one, and caches it', async () => {
    const served = envelope({ tokens: { color: { primary: SERVED } } })
    ;(fetchTheme as jest.Mock).mockResolvedValue(served)
    const { getByTestId } = app(null)
    expect(getByTestId('primary').props.children).toBe(themeColor(defaultAppTheme(), 'primary'))
    await waitFor(() => expect(getByTestId('primary').props.children).toBe(SERVED))
    expect(fetchTheme).toHaveBeenCalledWith({ root: 'https://api.example.com/v400/en/demo', appId: 'app-1' })
    expect(writeCachedTheme).toHaveBeenCalledWith('demo', served)
  })

  it('paints the cached theme from the first render', () => {
    ;(fetchTheme as jest.Mock).mockResolvedValue(null)
    const { getByTestId } = app(envelope({ tokens: { color: { primary: SERVED } } }))
    expect(getByTestId('primary').props.children).toBe(SERVED)
    expect(seen).toHaveLength(1)
  })

  it('keeps the same theme object when the served theme equals the cached one, and does not write it again', async () => {
    const cached = envelope({ tokens: { color: { primary: SERVED } } })
    ;(fetchTheme as jest.Mock).mockResolvedValue(JSON.parse(JSON.stringify(cached)))
    app(cached)
    await waitFor(() => expect(fetchTheme).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    expect(new Set(seen).size).toBe(1)
    expect(writeCachedTheme).not.toHaveBeenCalled()
  })

  it('keeps what it paints when nothing is served (offline, an error, another product)', async () => {
    ;(fetchTheme as jest.Mock).mockResolvedValue(null)
    const { getByTestId } = app(envelope({ tokens: { color: { primary: SERVED } } }))
    await waitFor(() => expect(fetchTheme).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    expect(getByTestId('primary').props.children).toBe(SERVED)
    expect(writeCachedTheme).not.toHaveBeenCalled()
  })

  it('asks for nothing without an API root or a project', () => {
    app(null, null)
    mockRoot.current = undefined
    app(null)
    expect(fetchTheme).not.toHaveBeenCalled()
  })

  it('useAppTheme() needs the provider', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow('useAppTheme() needs <AppThemeProvider>')
    error.mockRestore()
  })
})
