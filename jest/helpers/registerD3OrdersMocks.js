/* eslint-env jest */
/**
 * Native / third-party mocks for orders UI tests.
 * Import as the first line in each test file that needs them.
 */
jest.mock('react-native-vector-icons/Fontisto', () => 'Icon')
jest.mock('react-native-vector-icons/Entypo', () => 'Icon')

jest.mock('react-native-select-dropdown', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  return ({ data, defaultButtonText, onSelect, buttonTextAfterSelection }: any) => (
    <View testID="select-dropdown">
      <Text testID="select-dropdown-label">{defaultButtonText}</Text>
      {data?.map((item: any, index: number) => (
        <TouchableOpacity
          key={index}
          testID={`select-option-${index}`}
          onPress={() => onSelect?.(item, index)}
        >
          <Text>{buttonTextAfterSelection?.(item) ?? item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
})

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: (props: any) => <View testID="placeholder-line" {...props} />,
    Fade: {}
  }
})

jest.mock('react-native-html-to-pdf', () => ({
  convert: jest.fn(() => Promise.resolve({ filePath: '/tmp/order.pdf' }))
}))

jest.mock('react-native-print', () => ({
  print: jest.fn(() => Promise.resolve()),
  selectPrinter: jest.fn(() => Promise.resolve({ name: 'Printer' }))
}))

jest.mock('react-native-sound-player', () => ({
  playUrl: jest.fn(),
  stop: jest.fn()
}))
