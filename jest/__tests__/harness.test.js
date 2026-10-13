/* eslint-env jest */

describe("Jest harness", () => {
  it('loads @components mocks', () => {
    const ordering = require('../helpers/mockOrdering')
    expect(ordering.useLanguage).toBeDefined()
    expect(ordering.ToastType.Error).toBe('error')
  })

  it('loads @ui page stubs', () => {
    const ui = require('../helpers/mockUi')
    expect(ui.LoginForm).toBeDefined()
    expect(ui.OrderDetailsDelivery).toBeDefined()
    expect(ui.MapView).toBeDefined()
  })
})
