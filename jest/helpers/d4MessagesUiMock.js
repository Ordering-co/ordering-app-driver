/**
 * Partial @ui mock for messages/details components (driver app).
 */
/* eslint-env jest */

const path = require('path')

const root = path.join(__dirname, '../..')
const req = (relativePath) => require(path.join(root, relativePath))

const buildD4MessagesUiMock = (options = {}) => {
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')

  const stub = (testID) => () => React.createElement(View, { testID })

  return {
    OText: req('src/ui/src/components/shared/OText').default,
    OButton: req('src/ui/src/components/shared/OButton').default,
    OInput: req('src/ui/src/components/shared/OInput').default,
    OModal: req('src/ui/src/components/shared/OModal').default,
    OIcon: req('src/ui/src/components/shared/OIcon').default,
    OIconButton: req('src/ui/src/components/shared/OIconButton').default,
    OTextarea: req('src/ui/src/components/shared/OTextarea').default,
    ONavbar: req('src/ui/src/components/shared/ONavbar').default,
    OBottomPopup: req('src/ui/src/components/shared/OBottomPopup').default,
    OAlertOriginal: ({ open, content, title, onAccept, onClose }) =>
      open
        ? React.createElement(
          View,
          { testID: 'alert-original' },
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
    NotFoundSource: req('src/ui/src/components/NotFoundSource').NotFoundSource,
    OrderListSkeleton: req('src/ui/src/components/shared/OrderListSkeleton').OrderListSkeleton,
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
