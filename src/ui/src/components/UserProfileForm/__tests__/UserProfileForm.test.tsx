import '../../../../../../jest/helpers/uiModuleMocks'
const { captureDialogs } = require('../../../../../../jest/helpers/confirmDialogs')
import React from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'
import { launchCamera, launchImageLibrary } from 'react-native-image-picker'
import dayjs from 'dayjs'

import { useSession, useConfig, useToast, useValidationFields, useApi, useUtils } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn()
}))

// Whether the language row exists is the language selector's own to say (it loads the languages).
const mockLanguage = { shown: false }

jest.mock('@ui', () => {
  const React = require('react')
  const { View } = require('react-native')
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  const LanguageSelector = (props: any) => {
    React.useEffect(() => { props.onShownChange?.(mockLanguage.shown) }, [])
    return mockLanguage.shown
      ? React.createElement(View, { testID: 'language-selector-stub', accessibilityLabel: props.divided ? 'divided' : 'alone' })
      : null
  }
  return { ...buildD2AuthUiMock(), LanguageSelector }
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { userProfileDefaults } = require('../../../../../../jest/helpers/d2AuthDefaults')
  return {
    ...mockOrdering,
    UserFormDetails: renderUiController(userProfileDefaults)
  }
})

import { UserProfileForm } from '..'

/** The project's utility, as `useUtils` gives it: a date writer and the project's date and time formats. */
const projectUtils = (timeFormat = 'HH:mm') => [{
  parseDate: (date: any, options: any = {}) => dayjs(date).format(options.outputFormat ?? 'YYYY-MM-DD HH:mm'),
  dateFormat: 'YYYY-MM-DD',
  timeFormat,
  optimizeImage: (url: string) => url
}, {}]

const DRIVER = {
  id: 1,
  level: 4,
  email: 'user@test.com',
  name: 'Test',
  lastname: 'Driver',
  cellphone: '6465550129',
  country_phone_code: 1
}

/** The fields a project asks for: its name and e-mail, and its phone. */
const FIELDS = {
  loading: false,
  error: null,
  fields: {
    checkout: {
      name: { code: 'name', enabled: true, required: true, name: 'Name' },
      email: { code: 'email', enabled: true, required: true, name: 'Email' },
      cellphone: { code: 'cellphone', enabled: true, required: false, name: 'Cellphone' }
    }
  }
}

const sessionOf = (user: any = DRIVER, extra: any = {}) => [
  { auth: true, sessionLoading: false, user, ...extra },
  { logout: jest.fn() }
]

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

describe('UserProfileForm', () => {
  let showToast: jest.Mock

  beforeEach(() => {
    mockLanguage.shown = false
    showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([undefined, { showToast }])
    ;(useSession as jest.Mock).mockReturnValue(sessionOf())
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        allow_driver_update_data: { value: '1' },
        allow_delete_driver_account: { value: '1' }
      }
    }])
    ;(useValidationFields as jest.Mock).mockReturnValue([
      { loading: false },
      { loadOriginalValidationFields: jest.fn() }
    ])
    ;(useUtils as jest.Mock).mockReturnValue(projectUtils())
  })

  it('draws who the driver is: the photo, the name, the e-mail and the phone', () => {
    const { getByText, getByTestId, getAllByText } = renderWithProviders(<UserProfileForm validationFields={FIELDS} />)
    expect(getByText('Profile')).toBeTruthy()
    expect(getByTestId('profile-photo')).toBeTruthy()
    expect(getByText('Test Driver')).toBeTruthy()
    // Under the name and again as the information's rows.
    expect(getAllByText('user@test.com')).toHaveLength(2)
    expect(getAllByText('+1 646 555 0129')).toHaveLength(2)
  })

  describe('the information', () => {
    it('lists the fields the server asks for, with their value, and the phone', () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<UserProfileForm validationFields={FIELDS} />)
      const name = getByTestId('profile-info-name')
      expect(within(name).getByText('Name')).toBeTruthy()
      expect(within(name).getByText('Test')).toBeTruthy()
      expect(within(getByTestId('profile-info-email')).getByText('user@test.com')).toBeTruthy()
      expect(within(getByTestId('profile-info-cellphone')).getByText('+1 646 555 0129')).toBeTruthy()
      // A field the server does not list is not a row.
      expect(queryByTestId('profile-info-lastname')).toBeNull()
    })

    it('paints the name of a field muted and its value in the text color, as the Profile mockup does (an account row is the other way round)', () => {
      const withLastname = { ...FIELDS, fields: { checkout: { ...FIELDS.fields.checkout, lastname: { code: 'lastname', enabled: true, required: false, name: 'Last name' } } } }
      const { getByTestId } = renderWithProviders(<UserProfileForm validationFields={withLastname} />)
      const colors = (defaultAppTheme() as any).native.tokens.color
      for (const [key, name, value] of [['name', 'Name', 'Test'], ['lastname', 'Last name', 'Driver'], ['email', 'Email', 'user@test.com']]) {
        const row = getByTestId(`profile-info-${key}`)
        expect(flat(within(row).getByText(name)).color).toBe(colors.text_muted)
        expect(flat(within(row).getByText(value)).color).toBe(colors.text)
        // First and last name are rows of their own.
        expect(within(row).queryByText(key === 'name' ? 'Driver' : 'Test')).toBeNull()
      }
      expect(flat(within(getByTestId('profile-info-password')).getByText('Password')).color).toBe(colors.text_muted)
    })

    it('lists the last name when the project\'s validation fields ask for it (it is the server\'s to turn on, not the profile\'s)', () => {
      const withLastname = { ...FIELDS, fields: { checkout: { ...FIELDS.fields.checkout, lastname: { code: 'lastname', enabled: true, required: false, name: 'Last name' } } } }
      const { getByTestId } = renderWithProviders(<UserProfileForm validationFields={withLastname} />)
      const row = getByTestId('profile-info-lastname')
      expect(within(row).getByText('Last name')).toBeTruthy()
      expect(within(row).getByText('Driver')).toBeTruthy()
    })

    it('leaves out a field the server turns off, and the phone when its field is off', () => {
      const { queryByTestId } = renderWithProviders(
        <UserProfileForm
          showField={(code: string) => code !== 'email'}
          validationFields={{
            loading: false,
            error: null,
            fields: { checkout: { name: { code: 'name', enabled: true, name: 'Name' }, email: { code: 'email', enabled: false, name: 'Email' } } }
          }}
        />
      )
      expect(queryByTestId('profile-info-name')).toBeTruthy()
      expect(queryByTestId('profile-info-email')).toBeNull()
      expect(queryByTestId('profile-info-cellphone')).toBeNull()
    })

    it('writes the phone in the international form whatever the driver\'s country (a Colombian mobile, a number with no code)', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, cellphone: '3001234567', country_phone_code: '57' }))
      const colombian = renderWithProviders(<UserProfileForm validationFields={FIELDS} />)
      expect(within(colombian.getByTestId('profile-info-cellphone')).getByText('+57 300 1234567')).toBeTruthy()
      colombian.unmount()
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, cellphone: '3001234567', country_phone_code: null }))
      const bare = renderWithProviders(<UserProfileForm validationFields={FIELDS} />)
      expect(within(bare.getByTestId('profile-info-cellphone')).getByText('3001234567')).toBeTruthy()
    })

    it('says there is no phone when the driver has none', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, cellphone: null, country_phone_code: null }))
      const { getByTestId } = renderWithProviders(<UserProfileForm validationFields={FIELDS} />)
      expect(within(getByTestId('profile-info-cellphone')).getByText('Not Phone')).toBeTruthy()
    })

    it('writes its section titles small (14 / 600, the profile\'s own `account_page.title`), not at the shared section title\'s size', () => {
      const theme: any = defaultAppTheme()
      const { getByText } = renderWithProviders(<UserProfileForm navigation={{ navigate: jest.fn() }} />)
      for (const title of ['Information', 'Account']) {
        expect(flat(getByText(title))).toMatchObject({ fontSize: theme.native.components.account_page.base.title.fontSize })
        expect(flat(getByText(title)).fontSize).toBeLessThan(theme.native.components.section_header.base.title.fontSize)
      }
      expect(flat(getByText('Information')).fontSize).toBe(14)
    })

    it('gives "Account" its board\'s row: `account_page.base.title_min_height` (34) tall, with no space of its own under it', () => {
      const theme: any = defaultAppTheme()
      const { getByText } = renderWithProviders(<UserProfileForm navigation={{ navigate: jest.fn() }} />)
      expect(theme.native.components.account_page.base.title_min_height).toBe(34)
      let box: any = getByText('Account').parent
      while (box && flat(box)?.minHeight === undefined) box = box.parent
      expect(flat(box)).toEqual(expect.objectContaining({ minHeight: 34, marginBottom: 0 }))
    })

    it('opens the information\'s own screen with Edit', () => {
      const navigate = jest.fn()
      const { getByTestId, getByText } = renderWithProviders(<UserProfileForm navigation={{ navigate }} />)
      expect(getByText('Information')).toBeTruthy()
      fireEvent.press(getByTestId('profile-edit'))
      expect(navigate).toHaveBeenCalledWith('ProfileEdit')
    })

    it('opens the password\'s own screen with its row, which only masks the password', () => {
      const navigate = jest.fn()
      const { getByTestId } = renderWithProviders(<UserProfileForm navigation={{ navigate }} />)
      const row = getByTestId('profile-info-password')
      expect(within(row).getByText('••••••••')).toBeTruthy()
      fireEvent.press(row)
      expect(navigate).toHaveBeenCalledWith('ProfilePassword')
    })

    it('hides the password row with profile.password, and only it', () => {
      const { queryByTestId } = renderWithProviders(<UserProfileForm />, {
        themeOverrides: themeWith({ visibility: { 'profile.password': false } })
      })
      expect(queryByTestId('profile-info-password')).toBeNull()
      expect(queryByTestId('profile-info-name')).toBeTruthy()
      expect(queryByTestId('profile-edit')).toBeTruthy()
    })

    it('shows the data and no way to change it to a driver the server does not let edit', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { allow_driver_update_data: { value: '0' }, allow_delete_driver_account: { value: '0' } }
      }])
      const { queryByTestId, queryByText } = renderWithProviders(<UserProfileForm />)
      expect(queryByTestId('profile-info-name')).toBeTruthy()
      expect(queryByTestId('profile-edit')).toBeNull()
      expect(queryByTestId('profile-info-password')).toBeNull()
      expect(queryByText('Remove account')).toBeNull()
    })

    it('does not offer to edit while the validation fields load', () => {
      const { queryByTestId } = renderWithProviders(<UserProfileForm validationFields={{ loading: true, error: null, fields: {} }} />)
      expect(queryByTestId('profile-edit')).toBeNull()
      expect(queryByTestId('profile-info-password')).toBeNull()
    })

    it('draws nothing of the section for a user that has no fields and cannot edit', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { allow_driver_update_data: { value: '0' } } }])
      const { queryByTestId } = renderWithProviders(
        <UserProfileForm validationFields={{ loading: false, error: null, fields: { checkout: {} } }} />
      )
      expect(queryByTestId('profile-information')).toBeNull()
    })
  })

  describe('the account', () => {
    it('opens the schedule, sessions, payouts and Stripe screens from their rows, payouts before Stripe', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { stripe_connect_payouts_enabled: { value: '1' } } }])
      const navigate = jest.fn()
      const { getByTestId, getAllByTestId } = renderWithProviders(<UserProfileForm navigation={{ navigate }} />)
      expect(getAllByTestId(/^profile-row-/).map((row) => row.props.testID)).toEqual([
        'profile-row-schedule', 'profile-row-sessions', 'profile-row-payouts', 'profile-row-stripe'
      ])
      fireEvent.press(getByTestId('profile-row-schedule'))
      expect(navigate).toHaveBeenLastCalledWith('Schedule')
      fireEvent.press(getByTestId('profile-row-sessions'))
      expect(navigate).toHaveBeenLastCalledWith('Sessions')
      fireEvent.press(getByTestId('profile-row-payouts'))
      expect(navigate).toHaveBeenLastCalledWith('Payouts')
      fireEvent.press(getByTestId('profile-row-stripe'))
      expect(navigate).toHaveBeenLastCalledWith('StripeConnectAccount')
    })

    it('hides the Stripe account and payouts while Stripe Connect payouts are disabled', () => {
      const { queryByText } = renderWithProviders(<UserProfileForm />)
      expect(queryByText('Stripe account')).toBeNull()
      expect(queryByText('Payouts')).toBeNull()
    })

    it('hides the Stripe account and payouts for a user that is not a driver', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ id: 1, level: 0, email: 'admin@test.com', name: 'Admin' }))
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { stripe_connect_payouts_enabled: { value: '1' } } }])
      const { queryByText } = renderWithProviders(<UserProfileForm />)
      expect(queryByText('Stripe account')).toBeNull()
      expect(queryByText('Payouts')).toBeNull()
    })

    it('hides the schedule row with menu.schedule, and only it', () => {
      const { queryByText, getByText } = renderWithProviders(<UserProfileForm />, {
        themeOverrides: themeWith({ visibility: { 'menu.schedule': false } })
      })
      expect(queryByText('Schedule')).toBeNull()
      expect(getByText('Sessions')).toBeTruthy()
    })

    it('hides the sessions row with menu.sessions, and only it', () => {
      const { queryByText, getByText } = renderWithProviders(<UserProfileForm />, {
        themeOverrides: themeWith({ visibility: { 'menu.sessions': false } })
      })
      expect(queryByText('Sessions')).toBeNull()
      expect(getByText('Schedule')).toBeTruthy()
    })

    describe('today\'s hours on the schedule row', () => {
      beforeEach(() => {
        // A Tuesday, at noon.
        jest.useFakeTimers()
        jest.setSystemTime(new Date(2026, 6, 14, 12, 0, 0))
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      const day = (enabled: boolean, ...lapses: number[][]) => ({
        enabled,
        lapses: lapses.map(([open, close]) => ({ open: { hour: open, minute: 0 }, close: { hour: close, minute: 0 } }))
      })
      const week = (tuesday: any) => [day(false), day(true, [9, 17]), tuesday, day(true, [9, 17]), day(true, [9, 17]), day(true, [9, 17]), day(false)]

      it('says today\'s lapses, in the project\'s time format', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, schedule: week(day(true, [9, 13], [15, 20])) }))
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        expect(within(getByTestId('profile-row-schedule')).getByText('Today 09:00 - 13:00, 15:00 - 20:00')).toBeTruthy()
      })

      it('writes the hours as the project writes them', () => {
        ;(useUtils as jest.Mock).mockReturnValue(projectUtils('hh:mm A'))
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, schedule: week(day(true, [9, 18])) }))
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        expect(within(getByTestId('profile-row-schedule')).getByText('Today 09:00 AM - 06:00 PM')).toBeTruthy()
      })

      it('never cuts the hours with an ellipsis: at the largest text the value wraps to a second line (layout is seen on a device)', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, schedule: week(day(true, [9, 13], [15, 20])) }))
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        const value = within(getByTestId('profile-row-schedule')).getByText('Today 09:00 - 13:00, 15:00 - 20:00')
        // No line limit: nothing to end in an ellipsis; the value still gives way to the title (it shrinks and has a width ceiling).
        expect(value.props.numberOfLines).toBeUndefined()
        expect(flat(value).flexShrink).toBe(1)
        // The text may grow with the system's setting up to the app's limit, never past it.
        expect(value.props.maxFontSizeMultiplier).toBe(1.3)
      })

      it('says "Not available" on a day off', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, schedule: week(day(false)) }))
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        expect(within(getByTestId('profile-row-schedule')).getByText('Not available')).toBeTruthy()
      })

      it('says what the schedule screen draws for a driver without a schedule: every day, all day', () => {
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        const row = getByTestId('profile-row-schedule')
        expect(within(row).getByText('Schedule')).toBeTruthy()
        expect(within(row).getByText('Today 00:00 - 23:59')).toBeTruthy()
        expect(within(row).queryByText('Not available')).toBeNull()
      })

      it('says nothing when the driver\'s schedule does not cover today', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, schedule: [] }))
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        const row = getByTestId('profile-row-schedule')
        expect(within(row).queryByText(/Today/)).toBeNull()
      })
    })

    describe('the language', () => {
      it('is the last row of the account\'s card, with its own line, once its selector says it exists', () => {
        mockLanguage.shown = true
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        expect(within(getByTestId('profile-account')).getByTestId('language-selector-stub').props.accessibilityLabel).toBe('divided')
      })

      it('keeps the account out of sight while it has no row and the language is not known', () => {
        ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
        const theme = themeWith({ visibility: { 'menu.schedule': false, 'menu.sessions': false } })
        const alone = renderWithProviders(<UserProfileForm />, { themeOverrides: theme })
        // A section out of sight is still mounted, so its language row can say it exists.
        expect(flat(alone.getByTestId('profile-account', { includeHiddenElements: true }))?.display).toBe('none')
        alone.unmount()

        mockLanguage.shown = true
        const shown = renderWithProviders(<UserProfileForm />, { themeOverrides: theme })
        expect(flat(shown.getByTestId('profile-account'))?.display).not.toBe('none')
        expect(shown.getByTestId('language-selector-stub').props.accessibilityLabel).toBe('alone')
      })

      it('is not drawn nor mounted when the theme hides the language section', () => {
        mockLanguage.shown = true
        const sections = ['profile_photo', 'availability', 'information', 'account', 'language', 'logout', 'delete_account']
          .map((key) => ({ key, visible: key !== 'language' }))
        const { queryByTestId } = renderWithProviders(<UserProfileForm />, {
          themeOverrides: themeWith({ pages: { profile: { sections } } })
        })
        expect(queryByTestId('language-selector-stub')).toBeNull()
      })

      it('is a card of its own when the theme hides the account section', () => {
        mockLanguage.shown = true
        const sections = ['profile_photo', 'availability', 'information', 'account', 'language', 'logout', 'delete_account']
          .map((key) => ({ key, visible: key !== 'account' }))
        const { queryByTestId, getByTestId } = renderWithProviders(<UserProfileForm />, {
          themeOverrides: themeWith({ pages: { profile: { sections } } })
        })
        expect(queryByTestId('profile-account')).toBeNull()
        expect(queryByTestId('profile-row-sessions')).toBeNull()
        expect(within(getByTestId('profile-language')).getByTestId('language-selector-stub').props.accessibilityLabel).toBe('alone')
      })
    })
  })

  describe('account removal', () => {
    const originalFetch = global.fetch

    const mockCheckPassword = (body: any) => {
      global.fetch = jest.fn().mockResolvedValue({ json: async () => body }) as any
    }

    const renderAndOpenPasswordStep = (extraProps: any = {}) => {
      const handleRemoveAccount = jest.fn()
      const setRootState = jest.fn()
      const utils = renderWithProviders(
        <UserProfileForm
          handleRemoveAccount={handleRemoveAccount}
          setRootState={setRootState}
          {...extraProps}
        />
      )
      fireEvent.press(utils.getByText('Remove account'))
      fireEvent.press(utils.getByTestId('remove-account-accept'))
      return { ...utils, handleRemoveAccount, setRootState }
    }

    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ id: 1, level: 4, email: 'user@test.com', name: 'Test User' }, { token: 'driver-token' }))
      ;(useApi as jest.Mock).mockReturnValue([
        { root: 'https://api.test/v400/en/test', appId: 'driver-app', appInternalName: 'driver_app' },
        {}
      ])
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('draws the link as a quiet danger link, with the logout row in the page', () => {
      const theme: any = defaultAppTheme()
      const { getByText, getByTestId } = renderWithProviders(<UserProfileForm />)
      expect(flat(getByText('Remove account')).color).toBe(theme.native.components.link.variants.danger.color)
      expect(getByTestId('logout-button-stub')).toBeTruthy()
    })

    it('cannot be opened by an admin', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ id: 1, level: 0, email: 'admin@test.com', name: 'Admin' }))
      const { getByText, queryByText } = renderWithProviders(<UserProfileForm />)
      fireEvent.press(getByText('Remove account'))
      expect(queryByText('Are you sure that you want to remove your account?')).toBeNull()
    })

    it('asks for explicit confirmation before asking for the password', () => {
      const handleRemoveAccount = jest.fn()
      const { getByText, getByTestId, queryByTestId } = renderWithProviders(
        <UserProfileForm handleRemoveAccount={handleRemoveAccount} />
      )
      fireEvent.press(getByText('Remove account'))
      expect(getByText('Are you sure that you want to remove your account?')).toBeTruthy()
      expect(queryByTestId('remove-account-password')).toBeNull()
      fireEvent.press(getByTestId('remove-account-accept'))
      expect(getByTestId('remove-account-password')).toBeTruthy()
      expect(handleRemoveAccount).not.toHaveBeenCalled()
    })

    it('keeps the account when the driver cancels the confirmation', () => {
      const handleRemoveAccount = jest.fn()
      const { getByText, getByTestId, queryByText } = renderWithProviders(
        <UserProfileForm handleRemoveAccount={handleRemoveAccount} />
      )
      fireEvent.press(getByText('Remove account'))
      fireEvent.press(getByTestId('remove-account-cancel'))
      expect(queryByText('Are you sure that you want to remove your account?')).toBeNull()
      expect(handleRemoveAccount).not.toHaveBeenCalled()
    })

    it('keeps the account when the driver cancels at the password step', () => {
      mockCheckPassword({ error: false, result: 'OK' })
      const { getByTestId, queryByTestId, handleRemoveAccount } = renderAndOpenPasswordStep()
      fireEvent.press(getByTestId('remove-account-cancel'))
      expect(queryByTestId('remove-account-password')).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
      expect(handleRemoveAccount).not.toHaveBeenCalled()
    })

    it('asks for the password in a field with its label above, as the account page\'s fields', () => {
      const { getByTestId } = renderAndOpenPasswordStep()
      expect(getByTestId('remove-account-password').props.accessibilityLabel).toBe('Password')
    })

    it('requires a password before calling the API', () => {
      mockCheckPassword({ error: false, result: 'OK' })
      const { getByTestId, getByText, handleRemoveAccount } = renderAndOpenPasswordStep()
      fireEvent.press(getByTestId('remove-account-accept'))
      expect(getByText('The field Password is required')).toBeTruthy()
      expect(global.fetch).not.toHaveBeenCalled()
      expect(handleRemoveAccount).not.toHaveBeenCalled()
    })

    it('keeps the account and shows the error when the password is wrong', async () => {
      mockCheckPassword({ error: true, result: ['Invalid password'] })
      const { getByTestId, findByText, handleRemoveAccount, setRootState } = renderAndOpenPasswordStep()
      fireEvent.changeText(getByTestId('remove-account-password'), 'wrong-password')
      fireEvent.press(getByTestId('remove-account-accept'))
      expect(await findByText('Invalid password')).toBeTruthy()
      expect(handleRemoveAccount).not.toHaveBeenCalled()
      expect(setRootState).not.toHaveBeenCalled()
    })

    it('writes the password\'s error as the app\'s field error, at the start under its field (decision H7)', () => {
      const field = defaultAppTheme().native.components.field.base
      mockCheckPassword({ error: false, result: 'OK' })
      const { getByTestId, queryByTestId } = renderAndOpenPasswordStep()
      expect(queryByTestId('remove-account-error')).toBeNull()
      fireEvent.press(getByTestId('remove-account-accept'))
      const error = flat(getByTestId('remove-account-error'))
      expect(error.color).toBe(field.error_color)
      expect(error.fontSize).toBe(field.error.fontSize)
      expect(error.marginTop).toBe(field.message_gap)
      expect(error.textAlign).toBe('auto')
    })

    it('draws Cancel as every Cancel: neutral outline (decision H5)', () => {
      const button = defaultAppTheme().native.components.button
      const { getByText } = renderAndOpenPasswordStep()
      expect(flat(getByText('Cancel')).color).toBe(button.variants.neutral.outline.color)
    })

    it('removes the account after the password is validated', async () => {
      mockCheckPassword({ error: false, result: 'OK' })
      const { getByTestId, handleRemoveAccount, setRootState } = renderAndOpenPasswordStep()
      fireEvent.changeText(getByTestId('remove-account-password'), 'secret')
      fireEvent.press(getByTestId('remove-account-accept'))
      await waitFor(() => expect(handleRemoveAccount).toHaveBeenCalledWith(1))
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test/v400/en/test/users/check_password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'secret' }),
          headers: expect.objectContaining({ Authorization: 'Bearer driver-token' })
        })
      )
      expect(setRootState).toHaveBeenCalledWith({ isAuth: false, token: null })
    })
  })

  it('shows validation error state with refresh action', () => {
    const loadOriginalValidationFields = jest.fn()
    ;(useValidationFields as jest.Mock).mockReturnValue([
      { loading: false },
      { loadOriginalValidationFields }
    ])
    const { getByText } = renderWithProviders(
      <UserProfileForm validationFields={{ loading: false, error: ['Profile unavailable'] }} />
    )
    expect(getByText('Refresh profile')).toBeTruthy()
    fireEvent.press(getByText('Refresh profile'))
    expect(loadOriginalValidationFields).toHaveBeenCalledWith({ forceLoading: true })
  })

  it('shows loading placeholder while session loads', () => {
    ;(useSession as jest.Mock).mockReturnValue(sessionOf({ id: 1, level: 4, email: 'user@test.com', name: 'Test User' }, { sessionLoading: true }))
    const { getByTestId, queryByText } = renderWithProviders(<UserProfileForm />)
    expect(getByTestId('profile-skeleton')).toBeTruthy()
    expect(queryByText('Information')).toBeNull()
  })

  describe('theme', () => {
    const SECTIONS = ['profile_photo', 'availability', 'information', 'account', 'language', 'logout', 'delete_account']
    const HIDEABLE = ['profile_photo', 'availability', 'information', 'account', 'language']
    const sectionsTheme = (order: string[] = SECTIONS, hidden: string[] = []) => themeWith({
      pages: { profile: { sections: order.map((key) => ({ key, visible: !hidden.includes(key) })) } }
    })
    /** What each section draws, by something only it has. */
    const PIECES: Record<string, (utils: any) => any> = {
      profile_photo: ({ queryByTestId }) => queryByTestId('profile-photo'),
      availability: ({ queryByTestId }) => queryByTestId('profile-availability'),
      information: ({ queryByTestId }) => queryByTestId('profile-information'),
      account: ({ queryByTestId }) => queryByTestId('profile-row-sessions'),
      language: ({ queryByTestId }) => queryByTestId('language-selector-stub'),
      delete_account: ({ queryByText }) => queryByText('Remove account'),
      logout: ({ queryByTestId }) => queryByTestId('logout-button-stub')
    }

    beforeEach(() => {
      mockLanguage.shown = true
    })

    it('draws every section of the default theme', () => {
      const utils = renderWithProviders(<UserProfileForm />)
      SECTIONS.forEach((key) => expect(PIECES[key](utils)).toBeTruthy())
    })

    it.each(HIDEABLE)(
      'hides the section %s when the theme hides it, and only it',
      (hiddenKey) => {
        const utils = renderWithProviders(<UserProfileForm />, { themeOverrides: sectionsTheme(SECTIONS, [hiddenKey]) })
        SECTIONS.forEach((key) => {
          if (key === hiddenKey) expect(PIECES[key](utils)).toBeNull()
          else expect(PIECES[key](utils)).toBeTruthy()
        })
      }
    )

    it('draws the sections in the theme\'s order', () => {
      const order = ['profile_photo', 'account', 'information', 'availability', 'delete_account', 'logout', 'language']
      const { toJSON } = renderWithProviders(<UserProfileForm />, { themeOverrides: sectionsTheme(order) })
      const tree = JSON.stringify(toJSON())
      const at = (testID: string) => tree.indexOf(`"testID":"${testID}"`)
      expect(at('profile-photo')).toBeGreaterThan(-1)
      expect(at('profile-photo')).toBeLessThan(at('profile-row-sessions'))
      expect(at('profile-row-sessions')).toBeLessThan(at('profile-information'))
      expect(at('profile-information')).toBeLessThan(at('profile-availability'))
      expect(at('profile-availability')).toBeLessThan(at('logout-button-stub'))
    })

    it('hides the availability of a user that is not a driver', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ id: 1, level: 0, email: 'admin@test.com', name: 'Admin' }))
      const { queryByTestId } = renderWithProviders(<UserProfileForm />)
      expect(queryByTestId('profile-availability')).toBeNull()
    })

    it('lays the sections `lg` apart, on the theme\'s gutter, with the account page\'s room below', () => {
      const custom = themeWith({
        tokens: { layout: { page_gutter: 30 } },
        components: { account_page: { base: { padding_bottom: 50 } } }
      })
      const { UNSAFE_getByType } = renderWithProviders(<UserProfileForm />, { themeOverrides: custom })
      const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
      expect(content.paddingHorizontal).toBe(30)
      // The room above is the header's `xs` (decision H8): the page adds none of its own.
      expect(content.paddingTop).toBeUndefined()
      expect(content.paddingBottom).toBe(50)
      expect(content.gap).toBe(custom.native.tokens.space.lg)
    })

    it('paints the photo at the theme\'s size, with a glyph (never the app logo) for a driver without one', () => {
      const custom = themeWith({ components: { profile_photo: { base: { size: 80, radius: 40 } } } })
      const { getByTestId } = renderWithProviders(<UserProfileForm />, { themeOverrides: custom })
      const box = flat(getByTestId('profile-photo-box'))
      expect(box.width).toBe(80)
      expect(box.height).toBe(80)
      expect(box.borderRadius).toBe(40)
      expect(box.backgroundColor).toBe(custom.native.components.avatar.base.background)
      expect(within(getByTestId('profile-photo-box')).UNSAFE_queryAllByType(Image)).toHaveLength(0)
      // The glyph of a driver without a photo, at the profile photo's own glyph size.
      const glyph = within(getByTestId('profile-photo-box')).UNSAFE_getByProps({ name: 'person' })
      expect(glyph.props.size).toBe(custom.native.components.profile_photo.base.placeholder_icon_size)
      expect(glyph.props.color).toBe(custom.native.components.avatar.base.color)
    })

    it('paints the driver\'s photo', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, photo: 'https://img.test/driver.png' }))
      const { getByTestId } = renderWithProviders(<UserProfileForm />)
      const [picture] = within(getByTestId('profile-photo-box')).UNSAFE_getAllByType(Image)
      expect(picture.props.source).toEqual({ uri: 'https://img.test/driver.png', cache: 'force-cache' })
      expect(flat(picture).width).toBe(defaultAppTheme().native.components.profile_photo.base.size)
    })

    it('paints the name in the profile photo\'s text look', () => {
      const photo = defaultAppTheme().native.components.profile_photo.base
      const { getByText } = renderWithProviders(<UserProfileForm />)
      const name = flat(getByText('Test Driver'))
      expect(name.fontSize).toBe(photo.text.fontSize)
      expect(name.color).toBe(photo.text_color)
    })

    it('draws the availability as a tinted box in the soft fill, with no border and no shadow', () => {
      const { getByTestId } = renderWithProviders(<UserProfileForm />)
      const box = flat(getByTestId('profile-availability'))
      const tokens = defaultAppTheme().native.tokens
      expect(box.backgroundColor).toBe(tokens.color.surface_alt)
      expect(box.borderWidth).toBeUndefined()
      expect(box.shadowOpacity).toBeUndefined()
      expect(box.padding).toBe(tokens.space.md)
    })

    it('toggles the availability with the switch', () => {
      // The session's user says whether the driver is available.
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available: true }))
      const handleToggleAvalaibleStatusDriver = jest.fn()
      const { getByTestId, getByText } = renderWithProviders(
        <UserProfileForm
          isShowDriverStatus
          handleToggleAvalaibleStatusDriver={handleToggleAvalaibleStatusDriver}
          userState={{ loadingDriver: false, result: { error: false, result: { id: 1, available: true } } }}
        />
      )
      expect(getByText('Available to receive orders')).toBeTruthy()
      const toggle = getByTestId('profile-availability-switch')
      expect(toggle.props.accessibilityRole).toBe('switch')
      expect(toggle.props.accessibilityLabel).toBe('Available to receive orders')
      expect(toggle.props.accessibilityState).toMatchObject({ checked: true })
      fireEvent.press(toggle)
      expect(handleToggleAvalaibleStatusDriver).toHaveBeenCalledWith(false)
    })

    describe('switching the availability on (decision 2026-11-17: iOS needs persistent banners)', () => {
      const { Alert, NativeModules, Platform } = require('react-native')
      let getAlertStyle: jest.Mock
      let alert: jest.SpyInstance
      let dialogs: ReturnType<typeof captureDialogs>

      const renderSwitch = (available: boolean) => {
        // The session's user says whether the driver is available.
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available }))
        const handleToggleAvalaibleStatusDriver = jest.fn()
        const view = renderWithProviders(
          <UserProfileForm
            isShowDriverStatus
            handleToggleAvalaibleStatusDriver={handleToggleAvalaibleStatusDriver}
            userState={{ loadingDriver: false, result: { error: false, result: { id: 1, available } } }}
          />
        )
        return { ...view, handleToggleAvalaibleStatusDriver }
      }

      const press = async (view: any, value: boolean) => {
        await act(async () => {
          // The app's own switch toggles what it shows: pressed while off it asks for on, and the other way round.
          expect(view.getByTestId('profile-availability-switch').props.accessibilityState.checked).toBe(!value)
          fireEvent.press(view.getByTestId('profile-availability-switch'))
        })
      }

      beforeEach(() => {
        getAlertStyle = jest.fn(async () => 'persistent')
        NativeModules.NotificationSettings = { getAlertStyle }
        alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        dialogs = captureDialogs()
        jest.replaceProperty(Platform, 'OS', 'ios')
      })

      afterEach(() => {
        dialogs.off()
        delete NativeModules.NotificationSettings
        jest.restoreAllMocks()
      })

      it('refuses on iOS with a temporary style: no request, the alert, the switch stays off', async () => {
        getAlertStyle.mockResolvedValue('temporary')
        const view = renderSwitch(false)
        await press(view, true)
        expect(view.handleToggleAvalaibleStatusDriver).not.toHaveBeenCalled()
        // The app's dialog, not the system's alert.
        expect(alert).not.toHaveBeenCalled()
        expect(dialogs.requests).toHaveLength(1)
        expect(dialogs.last().title).toBe('Enable persistent notifications')
        expect([dialogs.last().acceptText, dialogs.last().cancelText]).toEqual(['Go to settings', 'Later'])
        expect(view.getByTestId('profile-availability-switch').props.accessibilityState.checked).toBe(false)
      })

      it('goes on with a persistent style', async () => {
        const view = renderSwitch(false)
        await press(view, true)
        expect(view.handleToggleAvalaibleStatusDriver).toHaveBeenCalledWith(true)
        expect(alert).not.toHaveBeenCalled()
      })

      it('checks the style again at each press: the driver may have changed it in Settings', async () => {
        getAlertStyle.mockResolvedValueOnce('temporary').mockResolvedValueOnce('persistent')
        const view = renderSwitch(false)
        await press(view, true)
        expect(view.handleToggleAvalaibleStatusDriver).not.toHaveBeenCalled()
        await press(view, true)
        expect(view.handleToggleAvalaibleStatusDriver).toHaveBeenCalledWith(true)
        expect(getAlertStyle).toHaveBeenCalledTimes(2)
        expect(dialogs.requests).toHaveLength(1)
      })

      it('goes on on Android even if the module says temporary', async () => {
        jest.replaceProperty(Platform, 'OS', 'android')
        getAlertStyle.mockResolvedValue('temporary')
        const view = renderSwitch(false)
        await press(view, true)
        expect(view.handleToggleAvalaibleStatusDriver).toHaveBeenCalledWith(true)
        expect(getAlertStyle).not.toHaveBeenCalled()
        expect(alert).not.toHaveBeenCalled()
      })

      it('goes on on an iOS without the native module', async () => {
        delete NativeModules.NotificationSettings
        const view = renderSwitch(false)
        await press(view, true)
        expect(view.handleToggleAvalaibleStatusDriver).toHaveBeenCalledWith(true)
        expect(alert).not.toHaveBeenCalled()
      })

      it('always switches off, without asking the style, with a temporary one', async () => {
        getAlertStyle.mockResolvedValue('temporary')
        const view = renderSwitch(true)
        await press(view, false)
        expect(view.handleToggleAvalaibleStatusDriver).toHaveBeenCalledWith(false)
        expect(getAlertStyle).not.toHaveBeenCalled()
        expect(alert).not.toHaveBeenCalled()
      })

      it('does not switch a driver who is already available off', async () => {
        getAlertStyle.mockResolvedValue('temporary')
        const view = renderSwitch(true)
        expect(view.getByTestId('profile-availability-switch').props.accessibilityState.checked).toBe(true)
        expect(view.handleToggleAvalaibleStatusDriver).not.toHaveBeenCalled()
        expect(alert).not.toHaveBeenCalled()
      })
    })

    it('keeps the switch in place while the availability is saved: disabled, never swapped for a spinner, so the row keeps its height', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available: true }))
      const { queryByTestId, getByTestId } = renderWithProviders(
        <UserProfileForm isShowDriverStatus userState={{ loadingDriver: true, result: { error: false, result: { id: 1, available: true } } }} />
      )
      expect(queryByTestId('profile-availability')).toBeTruthy()
      expect(queryByTestId('profile-availability-loading')).toBeNull()
      const toggle = getByTestId('profile-availability-switch')
      expect(toggle.props.accessibilityState).toMatchObject({ checked: true, disabled: true })
    })

    it('keeps the switch\'s state while a request runs, though the controller\'s answer carries no user', () => {
      ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available: true }))
      // The controller\'s own copy has no `result.result` (it never loaded the user): the session\'s user says the driver is available.
      const { getByTestId } = renderWithProviders(
        <UserProfileForm isShowDriverStatus userState={{ loadingDriver: true, result: { error: false } }} />
      )
      expect(getByTestId('profile-availability-switch').props.accessibilityState).toMatchObject({ checked: true, disabled: true })
    })

    describe('the answer to a toggle, the same on both platforms', () => {
      const asked = (userState: any, over: any = {}) => (
        <UserProfileForm isShowDriverStatus handleToggleAvalaibleStatusDriver={jest.fn()} userState={userState} {...over} />
      )

      it('shows what the server said when it refuses, even though its answer carries no user', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available: true }))
        const view = renderWithProviders(asked({ loadingDriver: false, result: { error: false, result: { id: 1, available: true } } }))
        fireEvent.press(view.getByTestId('profile-availability-switch'))
        view.rerender(asked({ loadingDriver: true, result: { error: false } }))
        expect(showToast).not.toHaveBeenCalled()
        // The controller\'s refusal: `result` is replaced by `{ error }`, with no `result.result` (the case that lost the message).
        view.rerender(asked({ loadingDriver: false, result: { error: 'You can\'t because you have assigned orders' } }))
        expect(showToast).toHaveBeenCalledTimes(1)
        expect(showToast).toHaveBeenCalledWith('error', 'You can\'t because you have assigned orders')
        // The switch is where it was, with the state it had.
        expect(view.getByTestId('profile-availability-switch').props.accessibilityState).toMatchObject({ checked: true, disabled: false })
      })

      it('words a list of errors, or an error that is a code, as every API message', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available: true }))
        const view = renderWithProviders(asked({ loadingDriver: false, result: { error: false } }))
        fireEvent.press(view.getByTestId('profile-availability-switch'))
        view.rerender(asked({ loadingDriver: true, result: { error: false } }))
        view.rerender(asked({ loadingDriver: false, result: { error: ['ERROR_USER_FIND'] } }))
        expect(showToast).toHaveBeenCalledWith('error', 'User not found')
      })

      it('confirms a save', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available: true }))
        const view = renderWithProviders(asked({ loadingDriver: false, result: { error: false, result: { id: 1, available: true } } }))
        fireEvent.press(view.getByTestId('profile-availability-switch'))
        view.rerender(asked({ loadingDriver: true, result: { error: false, result: { id: 1, available: true } } }))
        view.rerender(asked({ loadingDriver: false, result: { error: false, result: { id: 1, available: false } } }))
        expect(showToast).toHaveBeenCalledTimes(1)
        expect(showToast).toHaveBeenCalledWith('success', 'Available state is updated')
      })

      it('says nothing for a request the driver did not ask for (the screen opening, the user reloading)', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, available: true }))
        const view = renderWithProviders(asked({ loadingDriver: false, result: { error: false, result: { id: 1, available: true } } }))
        view.rerender(asked({ loadingDriver: true, result: { error: false } }))
        view.rerender(asked({ loadingDriver: false, result: { error: 'Something' } }))
        expect(showToast).not.toHaveBeenCalled()
      })
    })

    it('shows the state without a switch when the server turns the availability off', () => {
      const { getByText, queryByTestId } = renderWithProviders(<UserProfileForm isShowDriverStatus={false} />)
      expect(getByText('You are not Available to receive orders')).toBeTruthy()
      expect(queryByTestId('profile-availability-switch')).toBeNull()
    })
  })

  describe('the profile photo', () => {
    const pickerResponse = (response: any) => (_options: any, callback: any) => callback(response)
    const picture = { assets: [{ uri: 'file:///photo.jpg', type: 'image/jpeg', base64: 'AAAA' }] }

    beforeEach(() => {
      ;(launchCamera as jest.Mock).mockReset()
      ;(launchImageLibrary as jest.Mock).mockReset()
    })

    it('opens the photo sheet from the photo, with no picker yet', () => {
      const { getByTestId, getAllByLabelText, queryByTestId } = renderWithProviders(<UserProfileForm />)
      expect(getAllByLabelText('Change photo')).toHaveLength(2)
      expect(queryByTestId('photo-take')).toBeNull()
      fireEvent.press(getByTestId('profile-photo'))
      expect(getByTestId('photo-take')).toBeTruthy()
      expect(launchCamera).not.toHaveBeenCalled()
      expect(launchImageLibrary).not.toHaveBeenCalled()
    })

    it('opens the same sheet from the camera button, with its title and its two ways', () => {
      const { getByTestId, getByText } = renderWithProviders(<UserProfileForm />)
      fireEvent.press(getByTestId('profile-photo-edit'))
      expect(getByText('Profile photo')).toBeTruthy()
      expect(getByText('Take a photo')).toBeTruthy()
      expect(getByText('Choose from the gallery')).toBeTruthy()
    })

    it('draws the camera button from the theme\'s slot of the photo (`profile_photo.slots.edit`)', () => {
      const theme: any = defaultAppTheme()
      const slot = theme.native.components.profile_photo.slots.edit
      const { getByTestId } = renderWithProviders(<UserProfileForm />)
      const box = flat(getByTestId('profile-photo-edit').children[0] as any)
      expect(box.width).toBe(theme.native.components.button.sizes[slot.size].height)
    })

    it('draws the camera button round (the slot\'s `round` shape), and a square one when the theme says `icon`', () => {
      const theme: any = defaultAppTheme()
      expect(theme.native.components.profile_photo.slots.edit.shape).toBe('round')
      const round = renderWithProviders(<UserProfileForm />)
      expect(flat(round.getByTestId('profile-photo-edit').children[0] as any).borderRadius).toBe(theme.native.components.button.shapes.round.radius)
      round.unmount()
      const square: any = themeWith({ components: { profile_photo: { slots: { edit: { shape: 'icon' } } } } })
      const view = renderWithProviders(<UserProfileForm />, { themeOverrides: square })
      expect(flat(view.getByTestId('profile-photo-edit').children[0] as any).borderRadius).toBe(square.native.components.button.shapes.icon.radius)
    })

    describe('removing it', () => {
      const withPhoto = () => (useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, photo: 'https://img.test/driver.png' }))
      /** The native confirmation, answered: the button at `index` (0 accepts, 1 cancels). */
      const answer = (index: number) => jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons: any) => { buttons?.[index]?.onPress?.() })
      afterEach(() => { jest.restoreAllMocks() })

      it('has no option to remove it while the driver has no photo', () => {
        const { getByTestId, queryByText, queryByTestId } = renderWithProviders(<UserProfileForm handleRemovePhoto={jest.fn()} />)
        fireEvent.press(getByTestId('profile-photo'))
        expect(queryByText('Remove photo')).toBeNull()
        expect(queryByTestId('photo-remove')).toBeNull()
        // An empty photo (what the API keeps after a removal) is no photo.
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, photo: '' }))
        const empty = renderWithProviders(<UserProfileForm handleRemovePhoto={jest.fn()} />)
        fireEvent.press(empty.getByTestId('profile-photo'))
        expect(empty.queryByTestId('photo-remove')).toBeNull()
      })

      it('has no option when there is nothing to remove it with', () => {
        withPhoto()
        const { getByTestId, queryByTestId } = renderWithProviders(<UserProfileForm handleRemovePhoto={undefined} />)
        fireEvent.press(getByTestId('profile-photo'))
        expect(queryByTestId('photo-remove')).toBeNull()
        expect(getByTestId('photo-gallery')).toBeTruthy()
      })

      it('draws it last in the sheet, in the danger color, once the driver has a photo', () => {
        withPhoto()
        const { getByTestId, getByText } = renderWithProviders(<UserProfileForm handleRemovePhoto={jest.fn()} />)
        fireEvent.press(getByTestId('profile-photo'))
        expect(getByText('Take a photo')).toBeTruthy()
        expect(getByText('Choose from the gallery')).toBeTruthy()
        expect(flat(getByText('Remove photo')).color).toBe(defaultAppTheme().native.tokens.color.danger_text)
        // After the other two, and only it has no line under it.
        const texts = within(getByTestId('profile-photo-sheet')).getAllByText(/photo$|gallery$/).map((node: any) => node.props.children)
        expect(texts.slice(-3)).toEqual(['Take a photo', 'Choose from the gallery', 'Remove photo'])
        expect(flat(getByTestId('photo-gallery')).borderBottomWidth).toBeGreaterThan(0)
        expect(flat(getByTestId('photo-remove')).borderBottomWidth).toBeUndefined()
      })

      it('depends on the user having a photo, not on the picture having loaded: a photo that fails to load is still removable', () => {
        withPhoto()
        const { getByTestId, queryByTestId } = renderWithProviders(<UserProfileForm handleRemovePhoto={jest.fn()} />)
        // The picture has not loaded yet, then it fails: the avatar shows its placeholder, and the option is there both times.
        fireEvent.press(getByTestId('profile-photo'))
        expect(getByTestId('photo-remove')).toBeTruthy()
        act(() => { within(getByTestId('profile-photo-box')).UNSAFE_getByType(Image).props.onError({ nativeEvent: { error: 'unreachable' } }) })
        expect(within(getByTestId('profile-photo-box')).UNSAFE_queryAllByType(Image)).toHaveLength(0)
        expect(queryByTestId('photo-remove')).toBeTruthy()
      })

      it('asks first, in the app\'s dialog over the sheet, and removes nothing until the driver accepts', () => {
        withPhoto()
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const dialogs = captureDialogs()
        const handleRemovePhoto = jest.fn()
        const { getByTestId } = renderWithProviders(<UserProfileForm handleRemovePhoto={handleRemovePhoto} />)
        fireEvent.press(getByTestId('profile-photo'))
        fireEvent.press(getByTestId('photo-remove'))
        // Never the system alert; the accept button is named after the action and is the destructive one: never a bare "Accept".
        expect(alert).not.toHaveBeenCalled()
        expect(dialogs.last()).toEqual(expect.objectContaining({
          title: 'Ordering',
          message: 'Are you sure that you want to remove your photo?',
          acceptText: 'Remove',
          cancelText: 'Cancel',
          destructive: true
        }))
        expect(handleRemovePhoto).not.toHaveBeenCalled()
        // The sheet stays under the question.
        expect(getByTestId('photo-take')).toBeTruthy()
        dialogs.accept()
        expect(handleRemovePhoto).toHaveBeenCalledTimes(1)
        dialogs.off()
      })

      it('removes the photo and closes the sheet when the driver accepts', () => {
        withPhoto()
        answer(0)
        const handleRemovePhoto = jest.fn()
        const { getByTestId, queryByTestId } = renderWithProviders(<UserProfileForm handleRemovePhoto={handleRemovePhoto} />)
        fireEvent.press(getByTestId('profile-photo-edit'))
        fireEvent.press(getByTestId('photo-remove'))
        expect(handleRemovePhoto).toHaveBeenCalledTimes(1)
        expect(queryByTestId('photo-take')).toBeNull()
      })

      it('leaves the photo and the sheet as they were when the driver cancels', () => {
        withPhoto()
        answer(1)
        const handleRemovePhoto = jest.fn()
        const { getByTestId } = renderWithProviders(<UserProfileForm handleRemovePhoto={handleRemovePhoto} />)
        fireEvent.press(getByTestId('profile-photo'))
        fireEvent.press(getByTestId('photo-remove'))
        expect(handleRemovePhoto).not.toHaveBeenCalled()
        expect(getByTestId('photo-take')).toBeTruthy()
        // It can be asked again.
        fireEvent.press(getByTestId('photo-remove'))
        expect(Alert.alert).toHaveBeenCalledTimes(2)
      })

      it('shows the placeholder of a driver without photo once it is removed (the API keeps it empty)', () => {
        ;(useSession as jest.Mock).mockReturnValue(sessionOf({ ...DRIVER, photo: '' }))
        const { getByTestId } = renderWithProviders(<UserProfileForm />)
        expect(within(getByTestId('profile-photo-box')).UNSAFE_queryAllByType(Image)).toHaveLength(0)
        expect(within(getByTestId('profile-photo-box')).UNSAFE_getByProps({ name: 'person' })).toBeTruthy()
      })

      it('says its result as the others: the toast of the form\'s result, success or failure', () => {
        const { rerender } = renderWithProviders(<UserProfileForm formState={{ loading: false, changes: {}, result: { error: false, result: { id: 1, photo: '' } } }} />)
        expect(showToast).toHaveBeenCalledWith('success', 'Update successfully')
        rerender(<UserProfileForm formState={{ loading: false, changes: {}, result: { error: true, result: ['Not allowed'] } }} />)
        expect(showToast).toHaveBeenCalledWith('error', ['Not allowed'])
      })

      it('keeps the sheet shut while the photo is saved, as for a new one', () => {
        withPhoto()
        const { getByTestId, queryByTestId } = renderWithProviders(
          <UserProfileForm handleRemovePhoto={jest.fn()} formState={{ loading: true, changes: {}, result: { error: false } }} />
        )
        fireEvent.press(getByTestId('profile-photo'))
        expect(queryByTestId('photo-remove')).toBeNull()
      })
    })

    it('takes a photo with the camera and saves it as a data URL, then closes the sheet', () => {
      ;(launchCamera as jest.Mock).mockImplementation(pickerResponse(picture))
      const handleButtonUpdateClick = jest.fn()
      const { getByTestId, queryByTestId } = renderWithProviders(<UserProfileForm handleButtonUpdateClick={handleButtonUpdateClick} />)
      fireEvent.press(getByTestId('profile-photo'))
      fireEvent.press(getByTestId('photo-take'))
      expect(launchCamera).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', includeBase64: true, cameraType: 'front' }), expect.any(Function))
      // The profile photo is only uploaded: it is never also written to the driver's gallery.
      expect((launchCamera as jest.Mock).mock.calls[0][0].saveToPhotos).not.toBe(true)
      expect(handleButtonUpdateClick).toHaveBeenCalledWith(null, true, 'data:image/jpeg;base64,AAAA')
      expect(queryByTestId('photo-take')).toBeNull()
    })

    it('chooses a photo from the gallery and saves it the same way', () => {
      ;(launchImageLibrary as jest.Mock).mockImplementation(pickerResponse(picture))
      const handleButtonUpdateClick = jest.fn()
      const { getByTestId } = renderWithProviders(<UserProfileForm handleButtonUpdateClick={handleButtonUpdateClick} />)
      fireEvent.press(getByTestId('profile-photo-edit'))
      fireEvent.press(getByTestId('photo-gallery'))
      expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', includeBase64: true }), expect.any(Function))
      expect((launchImageLibrary as jest.Mock).mock.calls[0][0].saveToPhotos).not.toBe(true)
      expect(handleButtonUpdateClick).toHaveBeenCalledWith(null, true, 'data:image/jpeg;base64,AAAA')
    })

    it.each([['camera', 'photo-take', launchCamera], ['gallery', 'photo-gallery', launchImageLibrary]])(
      'says nothing and saves nothing when the driver cancels the %s',
      (_name, option, picker) => {
        ;(picker as jest.Mock).mockImplementation(pickerResponse({ didCancel: true }))
        const handleButtonUpdateClick = jest.fn()
        const { getByTestId, queryByTestId } = renderWithProviders(<UserProfileForm handleButtonUpdateClick={handleButtonUpdateClick} />)
        fireEvent.press(getByTestId('profile-photo'))
        fireEvent.press(getByTestId(option as string))
        expect(handleButtonUpdateClick).not.toHaveBeenCalled()
        expect(showToast).not.toHaveBeenCalled()
        expect(queryByTestId('photo-take')).toBeNull()
      }
    )

    it('shows the picker\'s own error, and saves nothing', () => {
      ;(launchCamera as jest.Mock).mockImplementation(pickerResponse({ errorCode: 'camera_unavailable', errorMessage: 'Camera not available on device' }))
      const handleButtonUpdateClick = jest.fn()
      const { getByTestId } = renderWithProviders(<UserProfileForm handleButtonUpdateClick={handleButtonUpdateClick} />)
      fireEvent.press(getByTestId('profile-photo'))
      fireEvent.press(getByTestId('photo-take'))
      expect(showToast).toHaveBeenCalledWith('error', 'Camera not available on device')
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('says the image was not found when the picker answers with no picture', () => {
      ;(launchImageLibrary as jest.Mock).mockImplementation(pickerResponse({ assets: [] }))
      const handleButtonUpdateClick = jest.fn()
      const { getByTestId } = renderWithProviders(<UserProfileForm handleButtonUpdateClick={handleButtonUpdateClick} />)
      fireEvent.press(getByTestId('profile-photo'))
      fireEvent.press(getByTestId('photo-gallery'))
      expect(showToast).toHaveBeenCalledWith('error', 'Image not found')
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('keeps the page while the photo uploads: a spinner over the photo, no skeleton, no taps on it', () => {
      const { getByTestId, queryByTestId, queryByText } = renderWithProviders(
        <UserProfileForm formState={{ loading: true, changes: {}, result: { error: false } }} />
      )
      expect(getByTestId('profile-photo-loading')).toBeTruthy()
      expect(queryByTestId('profile-skeleton')).toBeNull()
      expect(queryByText('Information')).toBeTruthy()
      fireEvent.press(getByTestId('profile-photo'))
      expect(queryByTestId('photo-take')).toBeNull()
    })

    it('says a saved photo, and its failure, with a toast', () => {
      const { rerender } = renderWithProviders(<UserProfileForm formState={{ loading: false, changes: {}, result: { error: false, result: { id: 1 } } }} />)
      expect(showToast).toHaveBeenCalledWith('success', 'Update successfully')
      rerender(<UserProfileForm formState={{ loading: false, changes: {}, result: { error: true, result: 'Too big' } }} />)
      expect(showToast).toHaveBeenCalledWith('error', 'Too big')
    })
  })
})
