/**
 * Partial @ui mock for stores UI components (driver app).
 */
/* eslint-env jest */

const path = require('path')

const root = path.join(__dirname, '../..')
const req = (relativePath) => require(path.join(root, relativePath))

const buildD5StoresUiMock = (options = {}) => {
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')

  return {
    OText: req('src/ui/src/components/shared/OText').default,
    OButton: req('src/ui/src/components/shared/OButton').default,
    OInput: req('src/ui/src/components/shared/OInput').default,
    OIcon: req('src/ui/src/components/shared/OIcon').default,
    OIconButton: req('src/ui/src/components/shared/OIconButton').default,
    NotFoundSource: req('src/ui/src/components/NotFoundSource').NotFoundSource,
    SearchBar: options.SearchBar || req('src/ui/src/components/SearchBar').SearchBar,
    BusinessController: options.BusinessController || (({ business }) =>
      React.createElement(
        View,
        { testID: `business-card-${business?.id}` },
        React.createElement(Text, null, business?.name)
      ))
  }
}

module.exports = { buildD5StoresUiMock }
