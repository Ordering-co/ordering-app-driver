/**
 * The real shared primitives of @ui (src/ui/src/components/shared), for the
 * partial @ui mocks of the test helpers: a screen converted to the theme uses
 * primitives its mock did not list before (OBadge, OCard, Tabs, Icon…).
 * Spread it first, so a mock's own entries win.
 */
/* eslint-env jest */

const path = require('path')

const sharedPrimitives = () => ({ ...require(path.join(__dirname, '../../src/ui/src/components/shared')) })

module.exports = { sharedPrimitives }
