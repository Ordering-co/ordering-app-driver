import fs from 'fs'
import path from 'path'

describe('RootNavigator push open after login', () => {
  it('re-runs the pending order navigation when auth changes', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../RootNavigator.tsx'),
      'utf8'
    )

    expect(src).toContain('getPushOpenOrderPlan')
    expect(src).toMatch(/useEffect\([\s\S]*getPushOpenOrderPlan[\s\S]*\[loaded,\s*orderId,\s*auth\]/)
  })
})
