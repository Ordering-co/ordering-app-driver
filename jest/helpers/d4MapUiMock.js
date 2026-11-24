/**
 * Fixture of the stubs of the D4 map components (driver app), shaped as the @ui barrel (see
 * uiModuleMocks.js). It lists only what a test replaces: a name it does not list is the real export
 * of its module.
 */
/* eslint-env jest */

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
  locationHookState
}
