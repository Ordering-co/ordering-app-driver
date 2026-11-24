import fs from 'fs'
import path from 'path'

const read = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8')

describe('RootNavigator background tracking', () => {
  it('leaves the location module to the hook and draws its dialog', () => {
    const src = read('../RootNavigator.tsx')

    expect(src).toContain('useDriverLocationTracking')
    expect(src).toMatch(/useDriverLocationTracking\(\{[\s\S]*blockedSchedule[\s\S]*isDriverLoginValidated/)
    expect(src).toContain('<DriverLocationDialog')
    // The licensed SDK is gone, and with it its listeners.
    expect(src).not.toContain('react-native-background-geolocation')
    expect(src).not.toContain('BackgroundGeolocation')
  })

  it('no longer posts the position from JavaScript (the native sender is the only one)', () => {
    const src = read('../RootNavigator.tsx')

    expect(src).not.toContain('updateDriverLocation')
    expect(src).not.toContain('onTouchEnd')
    expect(src).not.toMatch(/\/locations/)
    expect(src).not.toContain('useLocation')
  })

  it('stops tracking when the schedule block is shown (the run plan the hook obeys)', () => {
    const src = read('../useDriverLocationTracking.ts')

    expect(src).toContain('getBackgroundGeolocationRunPlan')
    expect(src).toMatch(/getBackgroundGeolocationRunPlan\(\{[\s\S]*blockedSchedule[\s\S]*driverLoginValidated/)
  })

  it('imports the native module only through the wrapper', () => {
    const hook = read('../useDriverLocationTracking.ts')
    expect(hook).toContain("'../native/driverLocation'")
    expect(hook).not.toContain('NativeDriverLocation')
  })
})
