/**
 * Fixture of the stubs of the D4 messages/details components (driver app), shaped as the @ui barrel
 * (see uiModuleMocks.js). It lists only what a test replaces: a name it does not list is the real
 * export of its module.
 */
/* eslint-env jest */

const buildD4MessagesUiMock = (options = {}) => {
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')

  const stub = (testID) => () => React.createElement(View, { testID })

  return {
    OAlertOriginal: ({ open, content, title, onAccept, onClose, notice }) =>
      open
        ? React.createElement(
          View,
          { testID: 'alert-original' },
          // A notice has one button and no Cancel; the stub says so, so a caller's `notice` can be asserted.
          notice && React.createElement(Text, { testID: 'alert-notice' }, 'notice'),
          React.createElement(Text, null, title),
          ...(Array.isArray(content) ? content : [content]).map((line, i) =>
            React.createElement(Text, { key: i }, line)
          ),
          React.createElement(
            Pressable,
            { testID: 'alert-accept', onPress: onAccept || onClose },
            React.createElement(Text, null, 'OK')
          )
        )
        : null,
    FloatingButton: ({ firstButtonClick, secondButtonClick, btnText, secondBtnText, firstButton, secondButton }) =>
      React.createElement(
        View,
        { testID: 'floating-button-stub' },
        React.createElement(
          Pressable,
          { testID: 'floating-first', onPress: firstButtonClick },
          React.createElement(Text, null, btnText || 'First')
        ),
        (secondButton || secondButtonClick) && React.createElement(
          Pressable,
          { testID: 'floating-second', onPress: secondButtonClick },
          React.createElement(Text, null, secondBtnText || 'Second')
        )
      ),
    WebsocketStatus: stub('websocket-status-stub'),
    PreviousMessages: options.PreviousMessages || stub('previous-messages-stub'),
    Chat: options.Chat || stub('chat-stub'),
    useDeviceOrientation: jest.fn(() => [{
      orientation: 'portrait',
      dimensions: { width: 390, height: 844 }
    }]),
    DeviceOrientationMethods: {
      useDeviceOrientation: jest.fn(() => [{
        orientation: 'portrait',
        dimensions: { width: 390, height: 844 }
      }])
    }
  }
}

module.exports = {
  buildD4MessagesUiMock
}
