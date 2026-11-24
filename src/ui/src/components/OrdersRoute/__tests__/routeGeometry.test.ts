import { kilometersBetween, routeKilometers, routeLegs, straightGeometry, type RouteGeometry } from '../routeGeometry'

const a = { latitude: 40, longitude: -74 }
const b = { latitude: 40.1, longitude: -74 }
const c = { latitude: 40.1, longitude: -73.9 }

describe('the route\'s geometry (routeGeometry)', () => {
  it('measures a straight line in kilometers (a tenth of a degree of latitude is about 11.1 km)', () => {
    expect(kilometersBetween(a, b)).toBeCloseTo(11.12, 1)
    expect(kilometersBetween(a, a)).toBe(0)
  })

  it('draws a straight leg as two points and never knows how long it takes', () => {
    expect(straightGeometry.leg(a, b)).toEqual({ path: [a, b], distanceKm: expect.any(Number), minutes: null })
  })

  describe('the legs of a route', () => {
    const stops = [{ number: 1, location: b }, { number: 2, location: c }]

    it('leave the driver for the first stop, then go from each stop to the next', () => {
      const legs = routeLegs(a, stops)
      expect(legs.map((leg) => [leg.fromStop, leg.toStop])).toEqual([[null, 1], [1, 2]])
      expect(legs[0].path).toEqual([a, b])
      expect(legs[1].path).toEqual([b, c])
      expect(routeKilometers(legs)).toBeCloseTo(legs[0].distanceKm + legs[1].distanceKm, 6)
    })

    it('have none that leaves the driver when his position is not known', () => {
      expect(routeLegs(null, stops).map((leg) => [leg.fromStop, leg.toStop])).toEqual([[1, 2]])
    })

    it('skip a stop that has no location: the legs go around it', () => {
      const legs = routeLegs(a, [{ number: 1, location: b }, { number: 2, location: null }, { number: 3, location: c }])
      expect(legs.map((leg) => [leg.fromStop, leg.toStop])).toEqual([[null, 1], [1, 3]])
    })

    it('are none for a route with nothing located, and a single one from the driver for one stop', () => {
      expect(routeLegs(a, [])).toEqual([])
      expect(routeLegs(null, [{ number: 1, location: b }])).toEqual([])
      expect(routeLegs(a, [{ number: 1, location: b }])).toHaveLength(1)
      expect(routeKilometers([])).toBe(0)
    })

    it('are the geometry\'s to draw: another geometry (streets, with minutes) replaces the lines and the screens read the same legs', () => {
      const streets: RouteGeometry = {
        leg: (from, to) => ({ path: [from, { latitude: to.latitude, longitude: from.longitude }, to], distanceKm: 20, minutes: 31 })
      }
      const legs = routeLegs(a, stops, streets)
      expect(legs[0]).toEqual({ fromStop: null, toStop: 1, path: [a, { latitude: b.latitude, longitude: a.longitude }, b], distanceKm: 20, minutes: 31 })
    })
  })
})
