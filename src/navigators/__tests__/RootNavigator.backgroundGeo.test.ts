import fs from 'fs'
import path from 'path'

describe('RootNavigator background geolocation schedule gate', () => {
  it('stops tracking when the schedule block is shown', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../RootNavigator.tsx'),
      'utf8'
    )

    expect(src).toContain('getBackgroundGeolocationRunPlan')
    expect(src).toContain('blockedSchedule')
    expect(src).toContain('isDriverLoginValidated')
    expect(src).toMatch(/getBackgroundGeolocationRunPlan\([\s\S]*blockedSchedule[\s\S]*isDriverLoginValidated/)
  })
})
