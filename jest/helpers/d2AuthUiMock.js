/**
 * Partial @ui mock for auth components — avoids loading the full @ui barrel.
 */
/* eslint-env jest */

const path = require('path')

const root = path.join(__dirname, '../..')

const req = (relativePath) => require(path.join(root, relativePath))

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

  const PhoneInputNumber = options.PhoneInputNumber || buildPhoneInputStub()

  return {
    OText: req('src/ui/src/components/shared/OText').default,
    OButton: req('src/ui/src/components/shared/OButton').default,
    OInput: req('src/ui/src/components/shared/OInput').default,
    OModal: req('src/ui/src/components/shared/OModal').default,
    OIcon: req('src/ui/src/components/shared/OIcon').default,
    OIconButton: req('src/ui/src/components/shared/OIconButton').default,
    OAlertOriginal: req('src/ui/src/components/shared/OAlertOriginal').default,
    ONavbar: req('src/ui/src/components/shared/ONavbar').default,
    PhoneInputNumber,
    VerifyPhone: req('src/ui/src/components/VerifyPhone').VerifyPhone,
    NotFoundSource: req('src/ui/src/components/NotFoundSource').NotFoundSource,
    useCountdownTimer: req('src/ui/src/hooks/useCountdownTimer').useCountdownTimer,
    LogoutButton: stub('logout-button-stub'),
    LanguageSelector: stub('language-selector-stub'),
    DriverSchedule: stub('driver-schedule-stub'),
    UserFormDetailsUI: options.UserFormDetailsUI || req('src/ui/src/components/UserFormDetails').UserFormDetailsUI
  }
}

module.exports = {
  buildD2AuthUiMock,
  buildPhoneInputStub
}
