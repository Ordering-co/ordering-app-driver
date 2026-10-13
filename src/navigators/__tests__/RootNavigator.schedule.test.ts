import fs from 'fs'
import path from 'path'

describe('RootNavigator schedule block', () => {
  it('applies getDriverScheduleBlockPlan when the user changes', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../RootNavigator.tsx'),
      'utf8'
    )

    expect(src).toContain('getDriverScheduleBlockPlan({ user })')
    expect(src).toContain('setBlockedSchedule(plan.blocked)')
    expect(src).toContain('blockedSchedule && isDriverLoginValidated')
  })
})
