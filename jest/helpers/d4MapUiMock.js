/**
 * Partial @ui mock for map components (driver app).
 */
/* eslint-env jest */

const path = require('path')

const root = path.join(__dirname, '../..')
const req = (relativePath) => require(path.join(root, relativePath))

const locationHookState = {
  initialPosition: { latitude: 40.7128, longitude: -74.006, speed: 0, mocked: false },
  userLocation: { latitude: 40.7128, longitude: -74.006, speed: 0, mocked: false },
  hasLocation: true,
  followUserLocation: jest.fn(),
  stopFollowUserLocation: jest.fn(),
  getCurrentLocation: jest.fn().mockResolvedValue({
    latitude: 40.7128,
    longitude: -74.006,
    speed: 0,
    mocked: false
  })
}

const buildD4MapUiMock = () => {
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')
  const stub = (testID) => () => React.createElement(View, { testID })

  return {
    OText: req('src/ui/src/components/shared/OText').default,
    OButton: req('src/ui/src/components/shared/OButton').default,
    OInput: req('src/ui/src/components/shared/OInput').default,
    OIcon: req('src/ui/src/components/shared/OIcon').default,
    OIconButton: req('src/ui/src/components/shared/OIconButton').default,
    OFab: req('src/ui/src/components/shared/OFab').default,
    ONavbar: req('src/ui/src/components/shared/ONavbar').default,
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
    FloatingButton: ({ firstButtonClick, secondButtonClick, btnText, secondBtnText, secondButton, isHideRejectButtons }) =>
      React.createElement(
        View,
        { testID: 'floating-button-stub' },
        !isHideRejectButtons && React.createElement(
          Pressable,
          { testID: 'floating-first', onPress: firstButtonClick },
          React.createElement(Text, null, btnText || 'Reject')
        ),
        (secondButton || secondButtonClick) && React.createElement(
          Pressable,
          { testID: 'floating-second', onPress: secondButtonClick },
          React.createElement(Text, null, secondBtnText || 'Accept')
        )
      ),
    useLocation: jest.fn(() => locationHookState),
    WebsocketStatus: stub('websocket-status-stub')
  }
}

module.exports = {
  buildD4MapUiMock,
  buildD4LegacyUiMock: buildD4MapUiMock,
  locationHookState
}
