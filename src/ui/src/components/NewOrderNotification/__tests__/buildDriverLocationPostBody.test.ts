import { buildDriverLocationPostBody } from '../buildDriverLocationPostBody'

const location = {
  latitude: 40.7128,
  longitude: -74.006,
  mocked: false
}

describe('buildDriverLocationPostBody', () => {
  it('matches the RootNavigator location body', () => {
    expect(buildDriverLocationPostBody(location, 4)).toEqual({
      location: JSON.stringify({
        lat: 40.7128,
        lng: -74.006,
        mock: false,
        v: '1.0'
      }),
      driver_id: 4
    })
  })

  it('is null when coords are missing', () => {
    expect(buildDriverLocationPostBody({ mocked: false }, 4)).toBeNull()
    expect(buildDriverLocationPostBody(null, 4)).toBeNull()
  })

  it('is null when driver id is missing', () => {
    expect(buildDriverLocationPostBody(location, null)).toBeNull()
    expect(buildDriverLocationPostBody(location, undefined)).toBeNull()
  })
})
