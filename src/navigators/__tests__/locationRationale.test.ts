import { NativeModules } from 'react-native'
import { locationRationale } from '../locationRationale'

const DEFAULTS = {
  title: 'Allow Driver App to access this device\'s location even when closed or not in use?',
  message: 'This app collects location data for locate drivers, stores and customers'
}

describe('locationRationale', () => {
  afterEach(() => {
    delete (NativeModules as any).AppStrings
  })

  it('uses the defaults where there is no native module (iOS)', () => {
    expect(locationRationale()).toEqual(DEFAULTS)
  })

  it('uses the defaults while the string resources hold the Builder\'s placeholders', () => {
    ;(NativeModules as any).AppStrings = {
      driver_location_permission_title: 'ALLOW_DRIVER_APP_ACCESS_LOCATION',
      description_driver_location_permission: 'DESCRIPTION_DRIVER_APP_ACCESS_LOCATION'
    }
    expect(locationRationale()).toEqual(DEFAULTS)
  })

  it('uses a brand\'s strings once the Builder has replaced the placeholders', () => {
    ;(NativeModules as any).AppStrings = {
      driver_location_permission_title: 'Share your location',
      description_driver_location_permission: 'We track the delivery'
    }
    expect(locationRationale()).toEqual({ title: 'Share your location', message: 'We track the delivery' })
  })

  it('falls back for each missing or empty string', () => {
    ;(NativeModules as any).AppStrings = { driver_location_permission_title: '' }
    expect(locationRationale()).toEqual(DEFAULTS)
  })
})
