export function buildDriverLocationPostBody (
  location: { latitude?: number, longitude?: number, mocked?: boolean } | null | undefined,
  driverId: unknown
) {
  if (driverId == null || driverId === '') return null
  if (!location?.latitude || !location?.longitude) return null

  return {
    location: JSON.stringify({
      lat: location.latitude,
      lng: location.longitude,
      mock: location.mocked,
      v: '1.0'
    }),
    driver_id: driverId
  }
}
