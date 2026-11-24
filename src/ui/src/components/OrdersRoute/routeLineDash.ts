import type { LatLng } from './routeGeometry'

/**
 * The dash of the route's lines. The theme gives it in points (`map_marker.base.line_dash`, `line_gap`), as a length on the
 * screen, and the two Google map libraries read the same prop differently:
 *
 * - Android takes the pattern in PIXELS (a `Dash` and a `Gap`: `MapPolyline.setLineDashPattern` gives the numbers to the library
 *   as they come), while it scales only the stroke's width by the screen's density (`MapPolylineManager.setStrokeWidth`). The
 *   theme's points are therefore multiplied by the pixel ratio, so 12 / 8 points are 12 / 8 dp there, as on iOS. And a round line
 *   cap turns every dash into a `Dot` (`MapPolyline.applyPattern`), ignoring the dash's length: react-native-maps defaults
 *   `lineCap` to `'round'` in JavaScript (`MapPolyline.tsx`), so the route's lines say `ROUTE_LINE_CAP` themselves.
 * - iOS takes it in METERS along the path (`GMSStyleSpans` with `kGMSLengthRhumb`), so a fixed number is a different length on
 *   the screen at every zoom: 2 m of dash on a route fitted into a phone is a sub-pixel tick, and the line reads as a hatched band.
 *   The pattern is therefore the theme's points times the meters one point is worth at the zoom the map shows, and it is drawn
 *   again when the zoom changes.
 */

/**
 * The cap of the route's lines: flat ends. Not setting one is not the same as having none: the library fills in `'round'`, which on
 * Android draws every dash as a dot.
 */
export const ROUTE_LINE_CAP = 'butt'

/** The ground distance of one degree of latitude. */
const METERS_PER_DEGREE = 111320

/** How many meters one point of the map is worth, from the latitude span the map shows and its height in points (0 when unknown). */
export const metersPerPoint = (latitudeDelta: number, mapHeight: number): number =>
  latitudeDelta > 0 && mapHeight > 0 ? (latitudeDelta * METERS_PER_DEGREE) / mapHeight : 0

/**
 * The scale in quarter steps of a doubling, so a pan or a small pinch does not draw every line again: the lines change with a real
 * zoom (a quarter of an octave is about 19% of the scale).
 */
export const settledScale = (meters: number): number => (meters > 0 ? 2 ** (Math.round(Math.log2(meters) * 4) / 4) : 0)

/**
 * The `lineDashPattern` of a route line for the platform: meters at this zoom on iOS (the theme's points when the zoom is not known
 * yet), and pixels on Android: the points times the pixel ratio (`PixelRatio.get()`, the density the library scales the stroke by).
 */
export const routeDashPattern = (os: string, dash: number, gap: number, meters: number, pixelRatio = 1): number[] => {
  if (os === 'ios') return meters > 0 ? [dash * meters, gap * meters] : [dash, gap]
  return [dash * pixelRatio, gap * pixelRatio]
}

/*
 * What the map will show once it is fitted, worked out from the same numbers the fit has (the framed points, the edge padding, the
 * room of the buttons' column and the map's size), so the iOS dash does not wait for the map's `onRegionChangeComplete`: the
 * callback does not always come (a move that is not animated, a region that hardly changes, a report that arrives before the map's
 * height is known) and the pattern kept a wrong scale until something else moved the map. The callback stays as the correction when
 * the driver zooms or pans.
 *
 * The map is a Web Mercator one (the two Google libraries): a degree of longitude is the same number of points everywhere and a degree
 * of latitude is longer the farther from the equator, so the spans are worked in Mercator `y`, as the library does, and the frame keeps
 * inside the padded area on the limiting side: the height (the usual one, a phone is tall) or the width (a route that runs east to west).
 */
/** What a map reports and an animation takes. */
export interface FittedRegion {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export interface FitFrame {
  /** What the camera frames. */
  points: LatLng[]
  /** The edge padding of the fit, on every side (points). */
  edge: number
  /** The room of the buttons' column, which is the map's own right padding (points). */
  sideRoom: number
  mapWidth: number
  mapHeight: number
  /** What a map that has one place to show frames around it (degrees of latitude). */
  singleDelta: number
}

const RADIANS = Math.PI / 180
/** The latitudes Web Mercator can draw. */
const MAX_LATITUDE = 85.05112878
/** Google's closest zoom (21) on 256-point tiles, as points per radian: a fit never goes closer, whatever the span. */
const MAX_POINTS_PER_RADIAN = (256 * 2 ** 21) / (2 * Math.PI)
/** Two points closer than this (about 10 cm) are one place. */
const SAME_PLACE = 1e-6

const mercatorY = (latitude: number): number =>
  Math.log(Math.tan(Math.PI / 4 + (Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude)) * RADIANS) / 2))
const latitudeOf = (y: number): number => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RADIANS)

/** The points with the repeated places taken out: stops at one address are one place to frame. */
export const distinctPoints = (points: LatLng[]): LatLng[] => {
  const kept: LatLng[] = []
  for (const point of points) {
    if (!kept.some((other) => Math.abs(other.latitude - point.latitude) < SAME_PLACE && Math.abs(other.longitude - point.longitude) < SAME_PLACE)) kept.push(point)
  }
  return kept
}

/**
 * The region the map shows after the fit of `frame.points` (null with no point). One place (one stop, or stops at the same address)
 * is framed at `singleDelta` around it, as the map asks for it; several are framed as the library's `fitToCoordinates` does: the whole
 * box inside the padded area, centred in it. The longitude delta is the padded width's (without the buttons' column).
 */
export const fittedRegion = (frame: FitFrame): FittedRegion | null => {
  const points = distinctPoints(frame.points)
  const mapHeight = Math.max(frame.mapHeight, 1)
  const mapWidth = Math.max(frame.mapWidth, 1)
  const roomWidth = Math.max(mapWidth - frame.sideRoom, 1)
  if (!points.length) return null
  if (points.length === 1) {
    return { ...points[0], latitudeDelta: frame.singleDelta, longitudeDelta: frame.singleDelta * (mapWidth / mapHeight) }
  }
  const latitudes = points.map((point) => point.latitude)
  const longitudes = points.map((point) => point.longitude)
  const south = mercatorY(Math.min(...latitudes))
  const north = mercatorY(Math.max(...latitudes))
  const west = Math.min(...longitudes)
  const east = Math.max(...longitudes)
  const spanY = north - south
  const spanX = (east - west) * RADIANS
  const availableHeight = Math.max(mapHeight - 2 * frame.edge, 1)
  const availableWidth = Math.max(roomWidth - 2 * frame.edge, 1)
  // Points per radian: the frame keeps inside the padded area on both axes, so the limiting one gives the zoom.
  const pointsPerRadian = Math.min(
    MAX_POINTS_PER_RADIAN,
    spanY > 0 ? availableHeight / spanY : Infinity,
    spanX > 0 ? availableWidth / spanX : Infinity
  )
  const centerY = (south + north) / 2
  const halfY = mapHeight / (2 * pointsPerRadian)
  return {
    latitude: latitudeOf(centerY),
    longitude: (west + east) / 2,
    latitudeDelta: latitudeOf(centerY + halfY) - latitudeOf(centerY - halfY),
    longitudeDelta: roomWidth / pointsPerRadian / RADIANS
  }
}

/*
 * The dash's scale must follow the region the map REALLY shows, and a map report cannot be trusted for it: react-native-maps builds the
 * payload of `onRegionChangeComplete` natively from the projection AT THE TIME the event is made (`makeGMSCameraPositionFromMap` in
 * `AIRGoogleMap.mm` ignores the camera it is given and reads `projection.visibleRegion`; Android reads `getVisibleRegion()` too), and
 * the event reaches JavaScript later, after a fit may have moved the map: the report of the INITIAL region delivered after the fit
 * described a region the map no longer showed. `getMapBoundaries()` reads the same visible region when it runs, so a report is only a
 * reason to read, and a programmatic move (the fit, the zoom buttons, locate) sets the scale from the region it asks for and then
 * confirms it with one read when its animation is over (`settleDelay`).
 */

/** What a programmatic animation takes to end at most (the library's default is shorter than the theme's slowest motion in practice). */
export const SETTLE_ANIMATION_MS = 1000
/** The wait after a move that is not animated, and the margin after one that is: the move is a command queued apart from the read. */
export const SETTLE_MARGIN_MS = 250

/** When to read the map after a programmatic move: once its animation would be over (not animated: after the margin). */
export const settleDelay = (animated: boolean, slowest: number): number =>
  (animated ? Math.max(slowest, SETTLE_ANIMATION_MS) : 0) + SETTLE_MARGIN_MS

/** What `getMapBoundaries()` answers on both platforms. */
export interface MapBounds {
  northEast: LatLng
  southWest: LatLng
}

/** The region of a bounding box the map reports (null for an answer that cannot be a region: not a number, or no size). */
export const regionOfBounds = (box: MapBounds | null | undefined): FittedRegion | null => {
  const north = Number(box?.northEast?.latitude)
  const south = Number(box?.southWest?.latitude)
  const east = Number(box?.northEast?.longitude)
  const west = Number(box?.southWest?.longitude)
  if (![north, south, east, west].every(Number.isFinite)) return null
  const latitudeDelta = north - south
  // A region across the date line has its east side lower than its west.
  const longitudeDelta = east >= west ? east - west : east + 360 - west
  if (!(latitudeDelta > 0) || !(longitudeDelta > 0)) return null
  return {
    latitude: (north + south) / 2,
    longitude: east >= west ? (east + west) / 2 : (east + 360 + west) / 2,
    latitudeDelta,
    longitudeDelta
  }
}
