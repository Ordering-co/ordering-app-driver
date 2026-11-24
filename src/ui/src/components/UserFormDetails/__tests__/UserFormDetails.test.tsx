import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useSession, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { userFormDetailsDefaults } from '../../../../../../jest/helpers/d2AuthDefaults'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { layoutWindowOf, onAndroid } from '../../../../../../jest/helpers/androidWindow'

// What the phone field was given, and what it answers when it is touched.
const mockPhone: { props: any, answer: any } = { props: null, answer: null }

jest.mock('@ui', () => {
  const React = require('react')
  const { TouchableOpacity } = require('react-native')
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  const PhoneInputNumber = (props: any) => {
    mockPhone.props = props
    return React.createElement(TouchableOpacity, {
      testID: 'phone-input-stub',
      onPress: () => props.handleData({ ...props.data, ...mockPhone.answer })
    })
  }
  return buildD2AuthUiMock({ PhoneInputNumber })
})

// The bottom bar's controller hands its props to its UI; the form's own controller does the same.
jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    FloatingButton: renderUiController({}),
    UserFormDetails: renderUiController({ formState: { loading: false, changes: {}, result: { error: false } } })
  }
})

import { UserFormDetails, UserFormDetailsUI } from '..'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

const PHONE_FIELD = { code: 'cellphone', enabled: true, required: false, name: 'Cellphone' }
const withPhone = (required = false) => ({
  ...userFormDetailsDefaults.validationFields,
  fields: { checkout: { ...userFormDetailsDefaults.validationFields.fields.checkout, cellphone: { ...PHONE_FIELD, required } } }
})

const changed = { loading: false, changes: { name: 'Updated' }, result: { error: false } }

/** The dialog leaving with unsaved typing asks: accept first, then the way back to the form. */
const discardDialog = () => {
  const [title, message, buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1)
  return { title, message, accept: buttons[0], cancel: buttons[1] }
}

describe('UserFormDetailsUI', () => {
  let showToast: jest.Mock
  let navigation: { goBack: jest.Mock }

  beforeEach(() => {
    mockPhone.props = null
    mockPhone.answer = null
    showToast = jest.fn()
    navigation = { goBack: jest.fn() }
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    ;(useToast as jest.Mock).mockReturnValue([undefined, { showToast }])
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        user: {
          id: 1,
          email: 'user@test.com',
          name: 'Test User',
          cellphone: '5551234567',
          country_phone_code: 1
        }
      },
      { logout: jest.fn() }
    ])
  })

  const renderInformation = (props: any = {}, options: any = {}) => renderWithProviders(
    <UserFormDetailsUI {...userFormDetailsDefaults} part='information' navigation={navigation} {...props} />,
    options
  )
  const renderPassword = (props: any = {}, options: any = {}) => renderWithProviders(
    <UserFormDetailsUI {...userFormDetailsDefaults} part='password' navigation={navigation} {...props} />,
    options
  )

  describe('the information', () => {
    it('is a screen with its title and its back arrow, over a scroll and a bottom bar', () => {
      const { getByText, getByLabelText, UNSAFE_getByType, getByTestId } = renderInformation()
      expect(getByText('Information')).toBeTruthy()
      expect(getByLabelText('Go back')).toBeTruthy()
      expect(UNSAFE_getByType(KeyboardAvoidingView).props.enabled).toBe(true)
      expect(UNSAFE_getByType(ScrollView)).toBeTruthy()
      expect(getByTestId('profile-form-bar')).toBeTruthy()
    })

    it('draws each field the server asks for, its label above its box, and no password', () => {
      const { getByLabelText, queryByLabelText, queryAllByLabelText } = renderInformation()
      expect(getByLabelText('Name')).toBeTruthy()
      expect(getByLabelText('Email')).toBeTruthy()
      expect(queryByLabelText('Confirm Password')).toBeNull()
      expect(queryAllByLabelText('Password')).toHaveLength(0)
    })

    it('draws a field the server turns off no more', () => {
      const { queryByLabelText } = renderInformation({ showField: (code: string) => code !== 'email' })
      expect(queryByLabelText('Name')).toBeTruthy()
      expect(queryByLabelText('Email')).toBeNull()
    })

    it('draws the phone field only when the server enables it, in the account page\'s scope', () => {
      const without = renderInformation()
      expect(without.queryByTestId('phone-input-stub')).toBeNull()
      without.unmount()

      const { getByTestId } = renderInformation({ validationFields: withPhone() })
      expect(getByTestId('phone-input-stub')).toBeTruthy()
      expect(mockPhone.props.scope).toBe('account_page')
      expect(mockPhone.props.defaultValue).toBe('5551234567')
      expect(mockPhone.props.defaultCode).toBe(1)
    })

    it('sends the typed value to the controller, the e-mail cleaned', () => {
      const handleChangeInput = jest.fn()
      const { getByLabelText } = renderInformation({ handleChangeInput })
      fireEvent.changeText(getByLabelText('Name'), 'Ana')
      expect(handleChangeInput).toHaveBeenLastCalledWith(expect.objectContaining({ target: { name: 'name', value: 'Ana' } }))
      fireEvent.changeText(getByLabelText('Email'), ' Ana(@Test.com ')
      expect(handleChangeInput).toHaveBeenLastCalledWith({ target: { name: 'email', value: 'ana@test.com' } })
    })

    it('has nothing to update until something changed: the bar\'s Update is off, then it saves', async () => {
      const handleButtonUpdateClick = jest.fn()
      const quiet = renderInformation({ handleButtonUpdateClick })
      expect(quiet.getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(true)
      fireEvent.press(quiet.getByText('Update'))
      await act(async () => {})
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
      quiet.unmount()

      const { getByText, getByTestId } = renderInformation({ handleButtonUpdateClick, formState: changed })
      expect(getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(false)
      await act(async () => {
        fireEvent.press(getByText('Update'))
      })
      await waitFor(() => expect(handleButtonUpdateClick).toHaveBeenCalledTimes(1))
      expect(handleButtonUpdateClick).toHaveBeenCalledWith(null)
    })

    it('paints Update as the bar\'s primary action', () => {
      const button = defaultAppTheme().native.components.button.variants
      const { getByTestId } = renderInformation({ formState: changed })
      expect(flat(getByTestId('profile-form-update').children[0] as any).backgroundColor).toBe(button.primary.solid.background)
    })

    it('says it is updating, and cannot be pressed again, while the save runs', () => {
      const handleButtonUpdateClick = jest.fn()
      const { getByText, getByTestId } = renderInformation({ handleButtonUpdateClick, formState: { ...changed, loading: true } })
      expect(getByText('Updating')).toBeTruthy()
      expect(getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(true)
      fireEvent.press(getByText('Updating'))
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('waits for the validation fields before it can save', () => {
      const { getByTestId } = renderInformation({ formState: changed, validationFields: { loading: true, fields: {} } })
      expect(getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(true)
    })

    it('leaves with the back arrow without saving what was typed, once the driver has chosen to discard it', async () => {
      const handleButtonUpdateClick = jest.fn()
      const { getByLabelText } = renderInformation({ handleButtonUpdateClick, formState: changed })
      fireEvent.changeText(getByLabelText('Name'), 'Typed, not saved')
      fireEvent.press(getByLabelText('Go back'))
      await act(async () => {})
      expect(navigation.goBack).not.toHaveBeenCalled()
      discardDialog().accept.onPress()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('saves the phone only when it is valid, and says why not', async () => {
      const handleButtonUpdateClick = jest.fn()
      const { getByTestId, getByText } = renderInformation({ handleButtonUpdateClick, formState: changed, validationFields: withPhone() })
      mockPhone.answer = { error: 'The Phone Number field is invalid' }
      fireEvent.press(getByTestId('phone-input-stub'))
      await act(async () => {
        fireEvent.press(getByText('Update'))
      })
      expect(showToast).toHaveBeenCalledWith('error', 'The Phone Number field is invalid')
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('does not save a cleared phone when the server requires one', async () => {
      const handleButtonUpdateClick = jest.fn()
      const { getByText } = renderInformation({
        handleButtonUpdateClick,
        validationFields: withPhone(true),
        formState: { loading: false, changes: { cellphone: null }, result: { error: false } }
      })
      await act(async () => {
        fireEvent.press(getByText('Update'))
      })
      expect(showToast).toHaveBeenCalledWith('error', 'The field Phone Number is required.')
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('reports the phone it was given to the controller as the two fields it saves', () => {
      const handleChangeInput = jest.fn()
      const { getByTestId } = renderInformation({ handleChangeInput, validationFields: withPhone() })
      mockPhone.answer = { phone: { country_phone_code: '52', cellphone: '5512345678' } }
      fireEvent.press(getByTestId('phone-input-stub'))
      expect(handleChangeInput).toHaveBeenCalledWith({
        country_phone_code: { name: 'country_phone_code', value: '52' },
        cellphone: { name: 'cellphone', value: '5512345678' }
      }, true)
    })

    describe('validation', () => {
      it('says under the field, and in a toast, that an e-mail is invalid, and does not send', async () => {
        const field = defaultAppTheme().native.components.field.base
        const handleButtonUpdateClick = jest.fn()
        const { getByLabelText, getByText, findByTestId } = renderInformation({ handleButtonUpdateClick, formState: changed })
        fireEvent.changeText(getByLabelText('Email'), 'not-an-email')
        await act(async () => {
          fireEvent.press(getByText('Update'))
        })
        const message = await findByTestId('error-email')
        expect(message.props.children).toBe('Invalid email address')
        // The app's field error: its look, at the start, the message's gap under its field.
        const style = flat(message)
        expect(style.color).toBe(field.error_color)
        expect(style.textAlign).toBe('auto')
        expect(style.marginTop).toBe(field.message_gap)
        expect(showToast).toHaveBeenCalledWith('error', '- Invalid email address')
        expect(handleButtonUpdateClick).not.toHaveBeenCalled()
      })

      it('says a required field is missing, with the server\'s name for it', async () => {
        const handleButtonUpdateClick = jest.fn()
        const { getByLabelText, getByText, findByTestId } = renderInformation({ handleButtonUpdateClick, formState: changed })
        fireEvent.changeText(getByLabelText('Name'), '')
        await act(async () => {
          fireEvent.press(getByText('Update'))
        })
        expect((await findByTestId('error-name')).props.children).toBe('Name is required')
        expect(handleButtonUpdateClick).not.toHaveBeenCalled()
      })

      it('does not ask for a field the server does not require', async () => {
        const handleButtonUpdateClick = jest.fn()
        const { getByLabelText, getByText, queryByTestId } = renderInformation({
          handleButtonUpdateClick,
          formState: changed,
          isRequiredField: () => false
        })
        fireEvent.changeText(getByLabelText('Name'), '')
        await act(async () => {
          fireEvent.press(getByText('Update'))
        })
        expect(queryByTestId('error-name')).toBeNull()
        await waitFor(() => expect(handleButtonUpdateClick).toHaveBeenCalledTimes(1))
      })

      it('paints the field in error with the theme\'s error border', async () => {
        const input = defaultAppTheme().native.components.input.variants.default.states.error
        const { getByLabelText, getByText } = renderInformation({ formState: changed })
        fireEvent.changeText(getByLabelText('Email'), 'nope')
        await act(async () => {
          fireEvent.press(getByText('Update'))
        })
        let node: any = getByLabelText('Email').parent
        while (node && StyleSheet.flatten(node.props?.style)?.borderColor !== input.border.borderColor) node = node.parent
        expect(node).toBeTruthy()
      })

      it('does not ask after a character was typed and deleted: the fields open empty and are empty again', async () => {
      const { getByLabelText } = renderPassword({})
      fireEvent.changeText(getByLabelText('Password'), 'a')
      fireEvent.changeText(getByLabelText('Password'), '')
      fireEvent.press(getByLabelText('Go back'))
      await act(async () => {})
      expect(Alert.alert).not.toHaveBeenCalled()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('takes the account page\'s own field error when the theme scopes one', async () => {
        const theme: any = buildAppTheme({
          version: 2,
          product_type: THEME_PRODUCT_TYPE,
          values: { components: { account_page: { scope: { field: { base: { error_color: '#123456', label_position: 'above' } } } } } }
        })
        const { getByLabelText, getByText, findByTestId } = renderInformation({ formState: changed }, { themeOverrides: theme })
        fireEvent.changeText(getByLabelText('Email'), 'nope')
        await act(async () => {
          fireEvent.press(getByText('Update'))
        })
        expect(flat(await findByTestId('error-email')).color).toBe('#123456')
      })
    })

    it('spaces the fields with the theme\'s field gap', () => {
      const custom = buildAppTheme({
        version: 2,
        product_type: THEME_PRODUCT_TYPE,
        values: { components: { field: { base: { gap: 30 } } } }
      })
      const { UNSAFE_getByType } = renderInformation({}, { themeOverrides: custom })
      expect(StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle).gap).toBe(30)
    })

    it('keeps the page\'s gutter on the scroll\'s content, not on its frame, with no room of its own above', () => {
      const custom = buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { tokens: { layout: { page_gutter: 30 } } } })
      const { UNSAFE_getByType } = renderInformation({}, { themeOverrides: custom })
      const scroll = UNSAFE_getByType(ScrollView)
      expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingHorizontal).toBe(30)
      expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingTop).toBeUndefined()
      expect(StyleSheet.flatten(scroll.props.style)?.paddingHorizontal).toBeUndefined()
    })
  })

  describe('leaving with what was typed not saved', () => {
    it('asks first, with "Discard" for the accept button and a way back named "Keep editing"', async () => {
      const { getByLabelText } = renderInformation({ formState: changed })
      fireEvent.press(getByLabelText('Go back'))
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      expect(discardDialog().message).toBe('You have changes that are not saved. Do you want to discard them?')
      expect(discardDialog().accept).toEqual(expect.objectContaining({ text: 'Discard', style: 'destructive' }))
      expect(discardDialog().cancel.text).toBe('Keep editing')
      expect(navigation.goBack).not.toHaveBeenCalled()
    })

    it('does not ask when what was typed is the value the screen opened with (a letter typed and deleted)', async () => {
      // The controller keeps a key in its changes once the field is typed in, whatever its value is now.
      const back = { loading: false, changes: { name: 'Test User', phone_extra: '', cellphone: '5551234567', country_phone_code: '1' }, result: { error: false } }
      const { getByLabelText, getByTestId } = renderInformation({ formState: back })
      fireEvent.press(getByLabelText('Go back'))
      expect(Alert.alert).not.toHaveBeenCalled()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(true)
    })

    it('asks when a value differs from the one the screen opened with, even next to one that does not', async () => {
      const mixed = { loading: false, changes: { name: 'Test User', lastname: 'Other' }, result: { error: false } }
      const { getByLabelText, getByTestId } = renderInformation({ formState: mixed })
      expect(getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(false)
      fireEvent.press(getByLabelText('Go back'))
      expect(Alert.alert).toHaveBeenCalledTimes(1)
    })

    it('keeping the form leaves it as it was: the typing, the screen and the bar\'s Update', async () => {
      const { getByLabelText, getByDisplayValue, getByTestId } = renderInformation({ formState: changed })
      fireEvent.press(getByLabelText('Go back'))
      discardDialog().cancel.onPress?.()
      expect(navigation.goBack).not.toHaveBeenCalled()
      expect(getByDisplayValue(changed.changes.name)).toBeTruthy()
      expect(getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(false)
    })

    it('a form with nothing typed goes back at once, with no question', () => {
      const { getByLabelText } = renderInformation()
      fireEvent.press(getByLabelText('Go back'))
      expect(Alert.alert).not.toHaveBeenCalled()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('a password form with nothing typed goes back at once; one field typed asks', () => {
      const clean = renderPassword()
      fireEvent.press(clean.getByLabelText('Go back'))
      expect(Alert.alert).not.toHaveBeenCalled()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      clean.unmount()
      const typed = renderPassword()
      fireEvent.changeText(typed.getByLabelText('Password'), 'secret-1')
      fireEvent.press(typed.getByLabelText('Go back'))
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    describe('the system\'s back (button, swipe)', () => {
      const withListener = () => {
        let handler: (event: any) => void = () => {}
        const nav = {
          goBack: jest.fn(),
          dispatch: jest.fn(),
          addListener: jest.fn((_name: string, listener: any) => { handler = listener; return jest.fn() })
        }
        const event = () => ({ preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } })
        return { nav, event, fire: (e: any) => handler(e) }
      }

      it('is stopped and asked about while there is unsaved typing, and goes on only when accepted', () => {
        const { nav, event, fire } = withListener()
        renderInformation({ formState: changed, navigation: nav })
        const leaving = event()
        fire(leaving)
        expect(nav.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function))
        expect(leaving.preventDefault).toHaveBeenCalledTimes(1)
        expect(nav.dispatch).not.toHaveBeenCalled()
        discardDialog().accept.onPress()
        expect(nav.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' })
        expect(nav.dispatch).toHaveBeenCalledTimes(1)
      })

      it('keeping the form drops the leaving', () => {
        const { nav, event, fire } = withListener()
        renderInformation({ formState: changed, navigation: nav })
        fire(event())
        discardDialog().cancel.onPress?.()
        expect(nav.dispatch).not.toHaveBeenCalled()
      })

      it('is let through with nothing typed', () => {
        const { nav, event, fire } = withListener()
        renderInformation({ navigation: nav })
        const leaving = event()
        fire(leaving)
        expect(leaving.preventDefault).not.toHaveBeenCalled()
        expect(Alert.alert).not.toHaveBeenCalled()
      })

      it('is let through once the save went through, though the typing is still there', () => {
        const { nav, event, fire } = withListener()
        const { rerender } = renderWithProviders(
          <UserFormDetailsUI {...userFormDetailsDefaults} navigation={nav} isEdit formState={changed} />
        )
        rerender(<UserFormDetailsUI {...userFormDetailsDefaults} navigation={nav} isEdit={false} formState={changed} />)
        expect(nav.goBack).toHaveBeenCalledTimes(1)
        const leaving = event()
        fire(leaving)
        expect(leaving.preventDefault).not.toHaveBeenCalled()
        expect(Alert.alert).not.toHaveBeenCalled()
      })

      it('asks once: the arrow\'s accepted way out does not ask again through the listener', () => {
        const { nav, event, fire } = withListener()
        nav.goBack.mockImplementation(() => fire(event()))
        const { getByLabelText } = renderInformation({ formState: changed, navigation: nav })
        fireEvent.press(getByLabelText('Go back'))
        expect(Alert.alert).toHaveBeenCalledTimes(1)
        discardDialog().accept.onPress()
        expect(Alert.alert).toHaveBeenCalledTimes(1)
        expect(nav.goBack).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('the save\'s answer', () => {
    it('says it went through and takes the driver back once the controller leaves the edit', () => {
      const { rerender } = renderWithProviders(
        <UserFormDetailsUI {...userFormDetailsDefaults} navigation={navigation} isEdit />
      )
      expect(navigation.goBack).not.toHaveBeenCalled()
      rerender(
        <UserFormDetailsUI
          {...userFormDetailsDefaults}
          navigation={navigation}
          isEdit={false}
          formState={{ loading: false, changes: {}, result: { error: false, result: { id: 1 } } }}
        />
      )
      expect(showToast).toHaveBeenCalledWith('success', 'Update successfully')
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('stays on the screen and says what failed when the save fails', () => {
      renderWithProviders(
        <UserFormDetailsUI
          {...userFormDetailsDefaults}
          navigation={navigation}
          isEdit
          formState={{ loading: false, changes: {}, result: { error: true, result: ['Email already exists'] } }}
        />
      )
      expect(showToast).toHaveBeenCalledWith('error', 'Email already exists')
      expect(navigation.goBack).not.toHaveBeenCalled()
    })

    it('says a failure that is a plain message as it is', () => {
      renderWithProviders(
        <UserFormDetailsUI
          {...userFormDetailsDefaults}
          navigation={navigation}
          isEdit
          formState={{ loading: false, changes: {}, result: { error: true, result: 'Network Error' } }}
        />
      )
      expect(showToast).toHaveBeenCalledWith('error', 'Network Error')
    })
  })

  describe('the password', () => {
    it('is a screen of its own with the password and its confirmation, and none of the data', () => {
      const { getAllByText, getByLabelText, queryByLabelText, queryByTestId } = renderPassword()
      // The bar's title and the field's label.
      expect(getAllByText('Password')).toHaveLength(2)
      expect(getByLabelText('Password').props.secureTextEntry).toBe(true)
      expect(getByLabelText('Confirm Password').props.secureTextEntry).toBe(true)
      expect(queryByLabelText('Name')).toBeNull()
      expect(queryByLabelText('Email')).toBeNull()
      expect(queryByTestId('phone-input-stub')).toBeNull()
    })

    it('draws nothing to type with profile.password off', () => {
      const { queryByLabelText } = renderPassword({}, {
        themeOverrides: buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { visibility: { 'profile.password': false } } })
      })
      expect(queryByLabelText('Confirm Password')).toBeNull()
    })

    it('shows and hides each password with its own eye button', () => {
      const { getByLabelText, getAllByLabelText } = renderPassword()
      expect(getByLabelText('Password').props.secureTextEntry).toBe(true)
      expect(getByLabelText('Confirm Password').props.secureTextEntry).toBe(true)
      const eyes = getAllByLabelText('Show password')
      expect(eyes).toHaveLength(2)
      fireEvent.press(eyes[0])
      expect(getByLabelText('Password').props.secureTextEntry).toBe(false)
      expect(getByLabelText('Confirm Password').props.secureTextEntry).toBe(true)
      fireEvent.press(getByLabelText('Hide password'))
      expect(getByLabelText('Password').props.secureTextEntry).toBe(true)
    })

    it('has nothing to update until both fields are typed', () => {
      const { getByLabelText, getByTestId } = renderPassword()
      const update = () => getByTestId('profile-form-update').props.accessibilityState.disabled
      expect(update()).toBe(true)
      fireEvent.changeText(getByLabelText('Password'), 'secret-1')
      expect(update()).toBe(true)
      fireEvent.changeText(getByLabelText('Confirm Password'), 'secret-1')
      expect(update()).toBe(false)
    })

    it('says under the confirmation, as soon as it differs, that the passwords do not match, and cannot update', async () => {
      const field = defaultAppTheme().native.components.field.base
      const handleButtonUpdateClick = jest.fn()
      const { getByLabelText, getByText, getByTestId, queryByTestId } = renderPassword({ handleButtonUpdateClick })
      fireEvent.changeText(getByLabelText('Password'), 'secret-1')
      expect(queryByTestId('error-confirmPassword')).toBeNull()
      fireEvent.changeText(getByLabelText('Confirm Password'), 'secret-2')
      const message = getByTestId('error-confirmPassword')
      expect(message.props.children).toBe('The passwords do not match')
      const style = flat(message)
      expect(style.color).toBe(field.error_color)
      expect(style.fontSize).toBe(field.error.fontSize)
      expect(style.textAlign).toBe('auto')
      expect(style.marginTop).toBe(field.message_gap)
      expect(getByTestId('profile-form-update').props.accessibilityState.disabled).toBe(true)
      await act(async () => {
        fireEvent.press(getByText('Update'))
      })
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('sends the new password, and only it, when both fields match', async () => {
      const handleButtonUpdateClick = jest.fn()
      const { getByLabelText, getByText } = renderPassword({ handleButtonUpdateClick })
      fireEvent.changeText(getByLabelText('Password'), 'secret-1')
      fireEvent.changeText(getByLabelText('Confirm Password'), 'secret-1')
      await act(async () => {
        fireEvent.press(getByText('Update'))
      })
      await waitFor(() => expect(handleButtonUpdateClick).toHaveBeenCalledTimes(1))
      expect(handleButtonUpdateClick).toHaveBeenCalledWith({ password: 'secret-1' })
    })

    it('leaves with the back arrow without sending what was typed, once the driver has chosen to discard it', async () => {
      const handleButtonUpdateClick = jest.fn()
      const { getByLabelText } = renderPassword({ handleButtonUpdateClick })
      fireEvent.changeText(getByLabelText('Password'), 'secret-1')
      fireEvent.changeText(getByLabelText('Confirm Password'), 'secret-1')
      fireEvent.press(getByLabelText('Go back'))
      await act(async () => {})
      expect(navigation.goBack).not.toHaveBeenCalled()
      discardDialog().accept.onPress()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(handleButtonUpdateClick).not.toHaveBeenCalled()
    })

    it('takes the account page\'s own field error when the theme scopes one', () => {
      const theme: any = buildAppTheme({
        version: 2,
        product_type: THEME_PRODUCT_TYPE,
        values: { components: { account_page: { scope: { field: { base: { error_color: '#123456', label_position: 'above' } } } } } }
      })
      const { getByLabelText, getByTestId } = renderPassword({}, { themeOverrides: theme })
      fireEvent.changeText(getByLabelText('Password'), 'secret-1')
      fireEvent.changeText(getByLabelText('Confirm Password'), 'secret-2')
      expect(flat(getByTestId('error-confirmPassword')).color).toBe('#123456')
    })
  })
})

describe('UserFormDetails', () => {
  it('wires the form to its own headless controller, with the part it was given', () => {
    ;(useSession as jest.Mock).mockReturnValue([{ auth: true, user: { id: 1, name: 'Ana' } }, {}])
    const { getAllByText, queryByLabelText } = renderWithProviders(
      <UserFormDetails
        part='password'
        navigation={{ goBack: jest.fn() }}
        isEdit
        validationFields={userFormDetailsDefaults.validationFields}
        showField={() => true}
        isRequiredField={() => false}
      />
    )
    expect(getAllByText('Password')).toHaveLength(2)
    expect(queryByLabelText('Name')).toBeNull()
  })

  describe('over the keyboard on Android', () => {
    // The activity pads the screens of the stack by the system bars: the keyboard's position is in the window's
    // coordinates, so the screen gives the avoiding view its distance from the window's top or its pinned bar
    // stays that much under the keyboard.
    let android: ReturnType<typeof onAndroid>
    beforeEach(() => { android = onAndroid(63) })
    afterEach(() => android.restore())

    it.each([['information'], ['password']])('the %s form gives its avoiding view the distance from the window\'s top', async (part) => {
      const page = renderWithProviders(
        <UserFormDetailsUI {...userFormDetailsDefaults} part={part} navigation={{ goBack: jest.fn() }} />
      )
      await layoutWindowOf(page.UNSAFE_getByType(KeyboardAvoidingView))
      expect(page.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(63)
      expect(page.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('height')
      expect(page.getByTestId('profile-form-bar')).toBeTruthy()
    })
  })
})
