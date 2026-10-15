import React from 'react'
import { render, screen, waitFor } from '@testing-library/react-native'
import App from '../DeliveryApp'
import settings from '../config.json'
import { prepareProjectStorage } from '../onboarding/prepareProjectStorage'
import * as localMode from '../onboarding/ios-local-mode'

jest.mock('../assets/sounds/notification.mp3', () => 1)
jest.mock('../config.json', () => ({ project: 'chosen', localProjectConfigured: true, use_root_point: true, api: { url: 'https://example.test', version: 'v400' }, socket: {} }))
jest.mock('../onboarding/prepareProjectStorage', () => ({ ...jest.requireActual('../onboarding/prepareProjectStorage'), prepareProjectStorage: jest.fn() }))
jest.mock('../appContainer', () => {
  const { Text } = require('react-native')
  return () => <Text>Application ready</Text>
})
jest.mock('../context/PermissionsContext', () => ({ PermissionsProvider: ({ children }) => children }))
jest.mock('@ui', () => ({
  OToast: () => null,
  OAlertOriginal: () => null,
  ThemeProvider: ({ children }) => children,
  OfflineActionsProvider: ({ children }) => children
}))
const mockProviderMounted = jest.fn()
jest.mock('@components', () => ({
  OrderingProvider: ({ children, settings }) => {
    mockProviderMounted(settings)
    return children
  }
}))
const prepare = prepareProjectStorage as jest.Mock

let errorSpy: jest.SpyInstance
beforeEach(() => {
  jest.clearAllMocks()
  ;(settings as any).localProjectConfigured = true
  errorSpy = jest.spyOn(console, 'error')
})
afterEach(() => {
  expect(errorSpy.mock.calls.flat().join(' ')).not.toMatch(/change in the order of Hooks|Rendered (more|fewer) hooks/i)
  errorSpy.mockRestore()
})

it('waits for project storage preparation before mounting SDK providers', async () => {
  let finish: (value: any) => void = () => {}
  prepare.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  render(<App />)
  expect(mockProviderMounted).not.toHaveBeenCalled()
  expect(screen.queryByText('Application ready')).not.toBeOnTheScreen()
  finish({ project: 'chosen', api: {}, socket: {}, use_root_point: false })
  expect(await screen.findByText('Application ready')).toBeOnTheScreen()
  expect(mockProviderMounted).toHaveBeenCalledWith(expect.objectContaining({ project: 'chosen', use_root_point: false }))
})

it('fails closed when preparing storage fails', async () => {
  prepare.mockRejectedValue(new Error('storage unavailable'))
  render(<App />)
  expect(await screen.findByRole('alert')).toBeOnTheScreen()
  expect(screen.getByText('Unable to prepare project storage. Close and reopen the app.')).toBeOnTheScreen()
  expect(mockProviderMounted).not.toHaveBeenCalled()
})

it('does not mount providers after unmount while preparation is pending', async () => {
  let finish: (value: any) => void = () => {}
  prepare.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  render(<App />)
  screen.unmount()
  finish({ project: 'chosen' })
  await waitFor(() => expect(prepare).toHaveBeenCalledTimes(1))
  expect(mockProviderMounted).not.toHaveBeenCalled()
})

it('shows the selected public project only in the explicit local preview', async () => {
  const mode = jest.spyOn(localMode, 'isLocalSimulatorMode').mockReturnValue(true)
  prepare.mockResolvedValue({ project: 'chosen', api: {}, socket: {} })
  render(<App />)
  expect(await screen.findByText('Local preview · project: chosen')).toBeOnTheScreen()
  mode.mockRestore()
})

it('mounts the normal DEV source immediately when no setup was requested', () => {
  delete (settings as any).localProjectConfigured
  prepare.mockImplementation(() => new Promise(() => {}))
  render(<App />)
  expect(screen.getByText('Application ready')).toBeOnTheScreen()
  expect(mockProviderMounted).toHaveBeenCalledWith(expect.objectContaining({ project: 'chosen', use_root_point: true }))
})
