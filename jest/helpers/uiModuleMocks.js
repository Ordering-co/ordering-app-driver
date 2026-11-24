/* eslint-env jest */
/**
 * Mocks of the concrete modules that the components of src/ui import (a component of src/ui never
 * imports the `@ui` barrel: that is a require cycle). A test that stubs part of the UI library
 * still writes its stubs as a barrel-shaped object, with `jest.mock('@ui', () => buildXUiMock())`
 * (the fixture: nothing of src/ui imports `@ui`, so it is only read from here), and imports this
 * file first:
 *
 *   import '<path to>/jest/helpers/uiModuleMocks'
 *
 * Each module below is then mocked as its real exports plus the entries of the fixture that live
 * in it, so `import { OAlertOriginal } from '../shared'` gets the stub the test wrote for it. A
 * name the fixture does not list is the real one. The module of the folder the test lives in is
 * never mocked (the component under test is the real one).
 *
 * A module is mocked for everything that imports it, not only for the components that used to read
 * it through the barrel: a test whose component under test imports a module directly (the accept
 * view reads the floating bar) keeps that one real by listing in its fixture only the names its
 * tree reads through the barrel: `pickUi(buildD3OrdersUiMock(), ['useOfflineActions'])`.
 */

const path = require('path')

const ui = (relative) => path.join(__dirname, '../../src/ui/src', relative)

// `names`: the exports of the module that the fixture can replace (all of them when omitted).
function mockModule (relative, names) {
  const actual = jest.requireActual(ui(relative))
  const testPath = (expect.getState().testPath || '').replace(/\\/g, '/')
  const folder = relative.split('/').slice(0, 2).join('/')
  if (testPath.includes(`/src/ui/src/${folder}/`) && relative.startsWith('components/') && relative !== 'components/shared') return actual
  const fixture = jest.requireMock('@ui')
  const picked = {}
  for (const name of names || Object.keys(actual)) if (name in fixture) picked[name] = fixture[name]
  return Object.keys(picked).length ? { __esModule: true, ...actual, ...picked } : actual
}

jest.mock('../../src/ui/src/components/shared', () => mockModule('components/shared'))
jest.mock('../../src/ui/src/components/AcceptOrRejectOrder', () => mockModule('components/AcceptOrRejectOrder', ['AcceptOrRejectOrder']))
jest.mock('../../src/ui/src/components/DriverMap', () => mockModule('components/DriverMap', ['DriverMap']))
jest.mock('../../src/ui/src/components/FloatingButton', () => mockModule('components/FloatingButton', ['FloatingButton']))
jest.mock('../../src/ui/src/components/LanguageSelector', () => mockModule('components/LanguageSelector', ['LanguageSelector']))
jest.mock('../../src/ui/src/components/LogoutButton', () => mockModule('components/LogoutButton', ['LogoutButton']))
jest.mock('../../src/ui/src/components/NotFoundSource', () => mockModule('components/NotFoundSource', ['NotFoundSource']))
jest.mock('../../src/ui/src/components/NotificationSetting', () => mockModule('components/NotificationSetting', ['NotificationSetting']))
jest.mock('../../src/ui/src/components/PhoneInputNumber', () => mockModule('components/PhoneInputNumber', ['PhoneInputNumber']))
jest.mock('../../src/ui/src/components/PreviousMessages', () => mockModule('components/PreviousMessages', ['PreviousMessages']))
jest.mock('../../src/ui/src/components/PreviousOrders', () => mockModule('components/PreviousOrders', ['PreviousOrders']))
jest.mock('../../src/ui/src/components/ProductItemAccordion', () => mockModule('components/ProductItemAccordion', ['ProductItemAccordion']))
jest.mock('../../src/ui/src/components/ReviewCustomer', () => mockModule('components/ReviewCustomer', ['ReviewCustomer']))
jest.mock('../../src/ui/src/components/VerifyPhone', () => mockModule('components/VerifyPhone', ['VerifyPhone']))
jest.mock('../../src/ui/src/components/WebsocketStatus', () => mockModule('components/WebsocketStatus', ['WebsocketStatus']))
jest.mock('../../src/ui/src/context/OfflineActions', () => mockModule('context/OfflineActions', ['useOfflineActions']))
jest.mock('../../src/ui/src/hooks/DeviceOrientation', () => mockModule('hooks/DeviceOrientation', ['DeviceOrientationMethods']))
jest.mock('../../src/ui/src/hooks/useCountdownTimer', () => mockModule('hooks/useCountdownTimer', ['useCountdownTimer']))
jest.mock('../../src/ui/src/hooks/useLocation', () => mockModule('hooks/useLocation', ['useLocation']))

/** The entries of `fixture` named in `names` (the others are then the real exports). */
const pickUi = (fixture, names) => {
  const out = {}
  for (const name of names) if (name in fixture) out[name] = fixture[name]
  return out
}

module.exports = { pickUi }
