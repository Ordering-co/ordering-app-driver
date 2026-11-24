import { appleStopUrl, googleRouteStops, googleRouteUrl, googleStopUrl, ROUTE_LINK_STOP_LIMIT, wazeStopUrl } from '../routeLinks'

// Fake coordinates: a made-up town.
const driver = { latitude: 40.7128, longitude: -74.006 }
const stop = (n: number) => ({ latitude: 40 + n / 10, longitude: -74 - n / 100 })

describe('the links that send the route to a maps app (routeLinks)', () => {
  describe('Google Maps, the whole route', () => {
    it('is the documented URL: origin the driver, the stops between as waypoints in order, the last one the destination, driving', () => {
      expect(googleRouteUrl(driver, [stop(1), stop(2), stop(3)])).toBe(
        'https://www.google.com/maps/dir/?api=1' +
        '&origin=40.7128%2C-74.006' +
        '&destination=40.3%2C-74.03' +
        '&waypoints=40.1%2C-74.01%7C40.2%2C-74.02' +
        '&travelmode=driving'
      )
    })

    it('leaves the origin out without the driver\'s position (Google starts from where the phone is)', () => {
      const url = googleRouteUrl(null, [stop(1), stop(2)]) as string
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=40.2%2C-74.02&waypoints=40.1%2C-74.01&travelmode=driving')
      expect(url).not.toContain('origin')
    })

    it('has no waypoints for a route of one stop, and no link for none', () => {
      expect(googleRouteUrl(driver, [stop(1)])).toBe('https://www.google.com/maps/dir/?api=1&origin=40.7128%2C-74.006&destination=40.1%2C-74.01&travelmode=driving')
      expect(googleRouteUrl(driver, [])).toBeNull()
    })

    it('carries at most 9 waypoints: the first 10 stops, the 10th as the destination', () => {
      const stops = Array.from({ length: 12 }, (_, index) => stop(index + 1))
      expect(ROUTE_LINK_STOP_LIMIT).toBe(10)
      expect(googleRouteStops(stops)).toEqual({ sent: stops.slice(0, 10), capped: true })
      const url = googleRouteUrl(driver, stops) as string
      const waypoints = decodeURIComponent(url.match(/waypoints=([^&]+)/)![1]).split('|')
      expect(waypoints).toHaveLength(9)
      expect(waypoints[8]).toBe('40.9,-74.09')
      expect(decodeURIComponent(url.match(/destination=([^&]+)/)![1])).toBe('41,-74.1')
    })

    it('does not cap ten stops or fewer', () => {
      expect(googleRouteStops(Array.from({ length: 10 }, (_, index) => stop(index))).capped).toBe(false)
      expect(googleRouteStops([stop(1)]).capped).toBe(false)
    })

    it('writes a coordinate with at most 6 decimals and never in exponent notation', () => {
      const url = googleRouteUrl(null, [{ latitude: 40.123456789, longitude: -0.0000001 }]) as string
      expect(url).toContain('destination=40.123457%2C0')
      expect(url).not.toMatch(/e-/)
    })

    it('is URL-encoded: nothing a URL could be broken by travels in it', () => {
      const url = googleRouteUrl(driver, [stop(1), stop(2), stop(3)]) as string
      const query = url.split('?')[1]
      expect(query).not.toMatch(/[|, ]/)
    })
  })

  describe('one destination: the next stop', () => {
    it('Google Maps', () => {
      expect(googleStopUrl(stop(1))).toBe('https://www.google.com/maps/dir/?api=1&destination=40.1%2C-74.01&travelmode=driving')
    })

    it('Waze', () => {
      expect(wazeStopUrl(stop(1))).toBe('https://waze.com/ul?ll=40.1,-74.01&navigate=yes')
    })

    it('Apple Maps', () => {
      expect(appleStopUrl(stop(1))).toBe('https://maps.apple.com/?daddr=40.1,-74.01&dirflg=d')
    })
  })

  it('carries coordinates and nothing else: no address, name or number, whatever the stops are', () => {
    const urls = [googleRouteUrl(driver, [stop(1), stop(2)]), googleStopUrl(stop(1)), wazeStopUrl(stop(1)), appleStopUrl(stop(1))] as string[]
    const coordinates = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?(\|-?\d+(\.\d+)?,-?\d+(\.\d+)?)*$/
    const fixed: Record<string, string> = { api: '1', travelmode: 'driving', navigate: 'yes', dirflg: 'd' }
    for (const url of urls) {
      for (const pair of url.split('?')[1].split('&')) {
        const [key, value] = pair.split('=')
        if (key in fixed) expect(decodeURIComponent(value)).toBe(fixed[key])
        else {
          expect(['origin', 'destination', 'waypoints', 'll', 'daddr']).toContain(key)
          expect(decodeURIComponent(value)).toMatch(coordinates)
        }
      }
    }
  })
})
