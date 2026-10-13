const React = require('react')

const mockPermissions = {
  permissions: { locationStatus: 'granted' },
  isGrantedPermissions: true,
  askLocationPermission: jest.fn(),
  redirectToSettings: jest.fn(),
  getPermissions: jest.fn(() => []),
  checkLocationPermission: jest.fn()
}

module.exports = {
  PermissionsContext: React.createContext(mockPermissions),
  PermissionsProvider: ({ children }) => children,
  permissionInitState: { locationStatus: 'unavailable' },
  mockPermissions
}
