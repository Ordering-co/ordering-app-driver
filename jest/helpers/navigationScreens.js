/**
 * Stand-ins for the app's pages in a test that runs the REAL navigators (`HomeNavigator`,
 * `BottomNavigator` and React Navigation 7): each page draws its name, keeps the `navigation` and
 * `route` it was given for the test to drive, and counts how many times its content was mounted.
 */
const React = require('react')
const { Text, View } = require('react-native')

const seen = {}
const mounts = {}
const heights = {}

const screen = (name, extra) => {
  const Screen = (props) => {
    seen[name] = props
    // What `useFloatingButtonInset` reads: a number inside the tabs, nothing over them.
    heights[name] = React.useContext(require('@react-navigation/bottom-tabs').BottomTabBarHeightContext)
    React.useEffect(() => {
      mounts[name] = (mounts[name] ?? 0) + 1
    }, [])
    return React.createElement(View, null,
      React.createElement(Text, null, `screen: ${name}`),
      extra ? extra(props) : null)
  }
  return { __esModule: true, default: Screen }
}

const reset = () => {
  for (const key of Object.keys(seen)) delete seen[key]
  for (const key of Object.keys(mounts)) delete mounts[key]
  for (const key of Object.keys(heights)) delete heights[key]
}

module.exports = { screen, seen, mounts, heights, reset }
