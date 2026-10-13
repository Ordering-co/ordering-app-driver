/**
 * Defaults + controller renderer for shell UI wired exports.
 */
/* eslint-env jest */

const React = require('react')

const renderUiController = (defaults = {}) => (props) => {
  const UI = props.UIComponent
  if (!UI) return null
  const { UIComponent, ...rest } = props
  return React.createElement(UI, { ...defaults, ...rest })
}

const languageSelectorDefaults = {
  languagesState: {
    loading: false,
    languages: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' }
    ]
  },
  currentLanguage: 'en',
  handleChangeLanguage: jest.fn()
}

const logoutActionDefaults = {
  handleLogoutClick: jest.fn().mockResolvedValue(true)
}

const websocketStatusDefaults = {
  socketStatus: 1,
  connectedDate: '2026-01-01T00:00:00.000Z'
}

module.exports = {
  renderUiController,
  languageSelectorDefaults,
  logoutActionDefaults,
  websocketStatusDefaults
}
