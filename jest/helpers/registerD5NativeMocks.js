/**
 * Native mocks for stores & PhoneInputNumber tests.
 * Import as the first line in BusinessProductList / PhoneInputNumber test files.
 */
/* eslint-env jest */

jest.mock('react-native-intersection-observer', () => {
  const React = require('react')
  const { ScrollView, View } = require('react-native')
  return {
    IOScrollView: (props) => React.createElement(ScrollView, props),
    InView: ({ children }) => React.createElement(View, null, children)
  }
})

jest.mock('react-native-phone-number-input', () => {
  const React = require('react')
  const { View, TextInput } = require('react-native')
  return React.forwardRef((props, ref) => {
    const lastRef = React.useRef(String(props.defaultValue || ''))
    React.useImperativeHandle(ref, () => ({
      isValidNumber: (n) => {
        const digits = String(n || '').replace(/\D/g, '')
        return digits.length >= 10 && digits.length <= 15
      },
      getCallingCode: () => '1',
      getNumberAfterPossiblyEliminatingZero: () => {
        const raw = String(lastRef.current || '')
        const digits = raw.replace(/\D/g, '')
        const number = digits.length > 10 ? digits.slice(-10) : digits
        return { number, formattedNumber: raw || `+1${number}` }
      }
    }))
    return React.createElement(
      View,
      { testID: 'phone-number-input' },
      React.createElement(TextInput, {
        testID: 'phone-number-text',
        placeholder: props.placeholder,
        defaultValue: props.defaultValue,
        onChangeText: (text) => {
          lastRef.current = text
          props.onChangeFormattedText?.(text)
        }
      })
    )
  })
})
