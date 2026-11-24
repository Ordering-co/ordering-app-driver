/**
 * Fixture of the stubs of the D2 auth components, shaped as the @ui barrel (see uiModuleMocks.js).
 * It lists only what a test replaces: a name it does not list is the real export of its module.
 */
/* eslint-env jest */

const buildPhoneInputStub = () => {
  const React = require('react')
  const { View, TextInput } = require('react-native')
  return (props) =>
    React.createElement(
      View,
      { testID: 'phone-input-stub' },
      React.createElement(TextInput, {
        testID: 'phone-input-field',
        value: props.data?.phone?.cellphone ?? '',
        onChangeText: (value) =>
          props.handleData?.({
            ...props.data,
            phone: { ...props.data?.phone, cellphone: value }
          })
      })
    )
}

const buildD2AuthUiMock = (options = {}) => {
  const React = require('react')
  const { View } = require('react-native')

  const stub = (testID) => () => React.createElement(View, { testID })

  // `PhoneInputNumber: null` keeps the real one (it is the one under test, or what the test reads).
  const PhoneInputNumber = 'PhoneInputNumber' in options ? options.PhoneInputNumber : buildPhoneInputStub()

  return {
    ...(PhoneInputNumber ? { PhoneInputNumber } : {}),
    LogoutButton: stub('logout-button-stub'),
    LanguageSelector: stub('language-selector-stub')
  }
}

module.exports = {
  buildD2AuthUiMock,
  buildPhoneInputStub
}
