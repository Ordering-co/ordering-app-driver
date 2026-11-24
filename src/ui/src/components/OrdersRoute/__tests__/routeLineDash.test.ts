import { ROUTE_LINE_CAP, distinctPoints, fittedRegion, metersPerPoint, regionOfBounds, routeDashPattern, settleDelay, settledScale } from '../routeLineDash'

describe('the dash of the route\'s lines', () => {
  it('is pixels on Android (the points times the pixel ratio) and meters at the shown zoom on iOS', () => {
    expect(routeDashPattern('android', 12, 8, 30, 2.625)).toEqual([31.5, 21])
    expect(routeDashPattern('android', 12, 8, 30, 1)).toEqual([12, 8])
    expect(routeDashPattern('android', 12, 8, 0, 3)).toEqual([36, 24])
    expect(routeDashPattern('ios', 12, 8, 30)).toEqual([360, 240])
  })

  it('does not let the pixel ratio touch the iOS pattern', () => {
    expect(routeDashPattern('ios', 12, 8, 30, 3)).toEqual(routeDashPattern('ios', 12, 8, 30))
    expect(routeDashPattern('ios', 12, 8, 0, 3)).toEqual([12, 8])
  })

  it('keeps the points on iOS when the zoom is not known yet', () => {
    expect(routeDashPattern('ios', 12, 8, 0)).toEqual([12, 8])
  })

  it('has flat ends: the library\'s own default, a round cap, draws every dash as a dot on Android', () => {
    expect(ROUTE_LINE_CAP).toBe('butt')
  })

  it('reads the meters of a point from the latitude span and the map\'s height', () => {
    expect(metersPerPoint(0.1, 800)).toBeCloseTo(13.915, 3)
    expect(metersPerPoint(0, 800)).toBe(0)
    expect(metersPerPoint(0.1, 0)).toBe(0)
  })

  it('settles the scale in quarter octaves, so small moves are the same scale', () => {
    expect(settledScale(0)).toBe(0)
    expect(settledScale(13.9)).toBe(settledScale(14.2))
    expect(settledScale(28)).toBeCloseTo(settledScale(14) * 2, 6)
  })
})

describe('the region a fit will show', () => {
  const frame = { edge: 40, sideRoom: 0, mapWidth: 400, mapHeight: 800, singleDelta: 0.01 }
  const at = (latitude: number, longitude: number) => ({ latitude, longitude })

  it('is the box over the padded height when the height limits it (a tall phone, a north-south route)', () => {
    // At the equator Mercator is the plain degrees: 0.4 degrees of latitude in 800 - 80 points shows 0.4 * 800 / 720 degrees.
    const region = fittedRegion({ ...frame, points: [at(0, 0), at(0.4, 0.01)] })!
    expect(region.latitudeDelta).toBeCloseTo(0.4 * 800 / 720, 3)
    expect(region.latitude).toBeCloseTo(0.2, 3)
    expect(region.longitude).toBeCloseTo(0.005, 6)
    // The map's width is the same scale: 400 points of the 0.4444 degrees per 800.
    expect(region.longitudeDelta).toBeCloseTo(0.4 * 800 / 720 / 2, 3)
  })

  it('is read from the width when the longitude span limits it (a route that runs east to west)', () => {
    // 0.2 degrees of longitude in 400 - 80 points: 0.2 / 320 degrees a point, 800 points tall.
    const region = fittedRegion({ ...frame, points: [at(0, 0), at(0.01, 0.2)] })!
    expect(region.latitudeDelta).toBeCloseTo(0.2 * 800 / 320, 3)
    expect(region.longitudeDelta).toBeCloseTo(0.2 * 400 / 320, 3)
    // Reading only the latitude would have said 0.011.
    expect(region.latitudeDelta).toBeGreaterThan(0.4)
  })

  it('keeps the buttons\' column out of the width: the frame must fit what is left', () => {
    const wide = fittedRegion({ ...frame, points: [at(0, 0), at(0.01, 0.2)] })!
    const narrow = fittedRegion({ ...frame, sideRoom: 80, points: [at(0, 0), at(0.01, 0.2)] })!
    expect(narrow.latitudeDelta).toBeCloseTo(0.2 * 800 / 240, 3)
    expect(narrow.latitudeDelta).toBeGreaterThan(wide.latitudeDelta)
    // Its height does not depend on the column.
    expect(fittedRegion({ ...frame, sideRoom: 80, points: [at(0, 0), at(0.4, 0.01)] })!.latitudeDelta).toBeCloseTo(0.4 * 800 / 720, 3)
  })

  it('shows more latitude for a taller map and less for a shorter one, the same box', () => {
    const points = [at(0, 0), at(0.4, 0.01)]
    expect(fittedRegion({ ...frame, mapHeight: 1000, points })!.latitudeDelta).toBeCloseTo(0.4 * 1000 / 920, 3)
    expect(fittedRegion({ ...frame, mapHeight: 600, points })!.latitudeDelta).toBeCloseTo(0.4 * 600 / 520, 3)
  })

  it('works the latitude in Mercator, so a route in the north is not read as one on the equator', () => {
    // At 60 degrees north a degree of latitude is twice as many points as at the equator: the same 0.2 degrees fill the height with
    // half the latitude shown by a map there.
    const north = fittedRegion({ ...frame, points: [at(60, 0), at(60.2, 0.001)] })!
    expect(north.latitudeDelta).toBeCloseTo(0.2 * 800 / 720, 2)
    // And the width limits it there with half the latitude per degree of longitude: 0.2 degrees east-west.
    const wide = fittedRegion({ ...frame, points: [at(60, 0), at(60.001, 0.2)] })!
    expect(wide.latitudeDelta).toBeCloseTo(0.2 * Math.cos(60 * Math.PI / 180) * 800 / 320, 2)
  })

  it('frames one place at the single-point region, and the same for stops at one address', () => {
    expect(fittedRegion({ ...frame, points: [at(40.7, -74)] })).toEqual({ latitude: 40.7, longitude: -74, latitudeDelta: 0.01, longitudeDelta: 0.005 })
    expect(fittedRegion({ ...frame, points: [at(40.7, -74), at(40.7, -74), at(40.70000001, -74)] })).toEqual({ latitude: 40.7, longitude: -74, latitudeDelta: 0.01, longitudeDelta: 0.005 })
    expect(distinctPoints([at(1, 1), at(1, 1), at(1, 2)])).toEqual([at(1, 1), at(1, 2)])
  })

  it('has nothing to say with no point, and never goes closer than the map\'s closest zoom', () => {
    expect(fittedRegion({ ...frame, points: [] })).toBeNull()
    const close = fittedRegion({ ...frame, points: [at(40.7, -74), at(40.7000011, -74)] })!
    expect(close.latitudeDelta).toBeGreaterThan(0.0003)
    expect(close.latitudeDelta).toBeLessThan(0.002)
  })

  it('survives a map with no room left after its padding', () => {
    const region = fittedRegion({ ...frame, mapHeight: 60, mapWidth: 60, points: [at(0, 0), at(1, 1)] })!
    expect(Number.isFinite(region.latitudeDelta) && region.latitudeDelta > 0).toBe(true)
  })
})

describe('what the map says it shows', () => {
  it('is the region of the bounding box `getMapBoundaries` answers', () => {
    expect(regionOfBounds({ northEast: { latitude: 40.8, longitude: -73.9 }, southWest: { latitude: 40.6, longitude: -74.1 } }))
      .toEqual({ latitude: expect.closeTo(40.7, 6), longitude: expect.closeTo(-74, 6), latitudeDelta: expect.closeTo(0.2, 6), longitudeDelta: expect.closeTo(0.2, 6) })
  })

  it('reads a box across the date line', () => {
    const region = regionOfBounds({ northEast: { latitude: 1, longitude: -179 }, southWest: { latitude: 0, longitude: 179 } })!
    expect(region.longitudeDelta).toBeCloseTo(2, 6)
  })

  it('is nothing for an answer that cannot be a region', () => {
    expect(regionOfBounds(null)).toBeNull()
    expect(regionOfBounds({ northEast: { latitude: NaN, longitude: 1 }, southWest: { latitude: 0, longitude: 0 } })).toBeNull()
    expect(regionOfBounds({ northEast: { latitude: 0, longitude: 1 }, southWest: { latitude: 0, longitude: 0 } })).toBeNull()
    expect(regionOfBounds({} as any)).toBeNull()
  })

  it('is read after a move when its animation would be over, and after a short margin when it is not animated', () => {
    expect(settleDelay(true, 300)).toBe(1250)
    expect(settleDelay(true, 2000)).toBe(2250)
    expect(settleDelay(false, 300)).toBe(250)
  })
})
