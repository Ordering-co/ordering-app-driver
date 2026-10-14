import { getLocalSimulatorSettings, isLocalSimulatorMode } from '../ios-local-mode'
import { getProjectScope } from '../prepareProjectStorage'
import { Platform, Settings } from 'react-native'

jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, Settings: { get: jest.fn() } }))
const source = { project: 'YOUR_PROJECT', api: { url: 'https://api.example.test', version: 'v400', language: 'en', extra: true }, socket: { url: 'https://socket.example.test' }, app_id: 'keep', use_root_point: true }
const config = { project: 'chosen', api: { url: 'https://api.example.test', version: 'v400', language: 'en' } }
const initialDev = global.__DEV__
beforeEach(() => {
  global.__DEV__ = true
  Platform.OS = 'ios'
  Settings.get.mockImplementation(key => key === 'OrderingLocalSimulatorMode' ? true : config)
})
afterEach(() => { global.__DEV__ = initialDev })

it('accepts the explicit native Debug simulator marker', () => {
  expect(isLocalSimulatorMode()).toBe(true)
  const selected = getLocalSimulatorSettings(source)
  expect(selected.project).toBe('chosen')
  expect(selected.localSimulatorMode).toBe(true)
  expect(selected.api.extra).toBe(true)
  expect(selected.socket).toEqual(source.socket)
  expect(selected.app_id).toBe('keep')
  expect(source.project).toBe('YOUR_PROJECT')
  expect(selected.api).not.toBe(source.api)
  expect(getProjectScope(selected)).not.toBe(getProjectScope({ ...selected, localSimulatorMode: false }))
})
it('accepts NSNumber true transported as numeric one', () => {
  Settings.get.mockImplementation(key => key === 'OrderingLocalSimulatorMode' ? 1 : config)
  expect(isLocalSimulatorMode()).toBe(true)
  expect(getLocalSimulatorSettings(source).project).toBe('chosen')
})
it('rejects the flag in release JavaScript and Android', () => {
  global.__DEV__ = false
  expect(isLocalSimulatorMode()).toBe(false)
  expect(getLocalSimulatorSettings(source)).toBe(source)
  global.__DEV__ = true
  Platform.OS = 'android'
  expect(isLocalSimulatorMode()).toBe(false)
})
it('does not enable local mode from a truthy string or missing native module', () => {
  Settings.get.mockReturnValue('true')
  expect(isLocalSimulatorMode()).toBe(false)
  Settings.get.mockImplementation(() => { throw new Error('Native Settings unavailable') })
  expect(isLocalSimulatorMode()).toBe(false)
  expect(getLocalSimulatorSettings(source)).toBe(source)
})
it('requires a validated selection instead of silently using a placeholder', () => {
  Settings.get.mockImplementation(key => key === 'OrderingLocalSimulatorMode' ? true : null)
  expect(() => getLocalSimulatorSettings(source)).toThrow('validated public project')
})
