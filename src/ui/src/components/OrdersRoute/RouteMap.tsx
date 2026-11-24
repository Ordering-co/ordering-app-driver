import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, PixelRatio, Platform, StyleSheet, View } from 'react-native'
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { OFab } from '../shared'
import { MapMarker } from '../MapView/MapMarker'
import { MapZoomControls, useMapZoom } from '../MapView/MapZoomControls'
import { routeScreenStyles } from './styles'
import { RouteStopMarker } from './RouteStopMarker'
import { ROUTE_LINE_CAP, distinctPoints, fittedRegion, metersPerPoint, regionOfBounds, routeDashPattern, settleDelay, settledScale } from './routeLineDash'
import type { LatLng, RouteLeg } from './routeGeometry'
import type { RouteStop } from './routeStops'
import { themeGutter, themeMotion, themePart, themeSpace, themeVisible } from '@/theme/helpers'

/**
 * The route over the app's map (the library's tiles with the app's own marks, as the Map tab and the order's map): the stops as
 * numbered discs in the route's order (`RouteStopMarker`, the next one stronger), the driver's own disc (`MapMarker`, drawn under the
 * stops), a dashed straight line between consecutive stops and, stronger, the one from the driver to the next stop
 * (`components.map_marker.base.line_*`), and the app's zoom, fit and locate buttons. No routing or directions service is called:
 * the lines only show the order of the stops (the legs come from `routeLegs`, the one place a routing service would replace).
 *
 * The camera fits every stop and the driver when the screen opens, when the stops change and when the driver's first position
 * arrives, for as long as the driver has not moved the map himself; the fit button frames them again whenever he asks. Its moves are
 * not animated when the theme has no motion or the system reduces it (`themeMotion`).
 */
interface Props {
  /** The stops that have a location, in the route's order. */
  stops: Array<RouteStop & { location: LatLng }>
  driver: LatLng | null
  legs: RouteLeg[]
  /** What a screen reader says of a stop. */
  spoken: (stop: RouteStop) => string
  /** The driver's position read once more, for the locate button (the map moves to where he is). */
  getCurrentLocation?: () => Promise<LatLng>
}

/** How much of the world a map that has a single point to show frames around it (the Map tab's own start). */
const SINGLE_POINT_DELTA = 0.01

export const RouteMap = ({ stops, driver, legs, spoken, getCurrentLocation }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => routeScreenStyles(theme), [theme])
  const { width, height } = Dimensions.get('window')
  const mapRef = useRef<MapView>(null)
  const [ready, setReady] = useState(false)
  // Follows the driver's own moves of the map: once he has touched it the camera stays where he put it, until he asks for the fit.
  const autoFit = useRef(true)
  const [controlsWidth, setControlsWidth] = useState(0)
  const line = useMemo(() => ({
    color: themePart(theme, 'map_marker', 'base.line_color'),
    width: themePart(theme, 'map_marker', 'base.line_width'),
    nextWidth: themePart(theme, 'map_marker', 'base.line_next_width'),
    nextColor: themePart(theme, 'map_marker', 'base.line_next_color'),
    dash: themePart(theme, 'map_marker', 'base.line_dash'),
    gap: themePart(theme, 'map_marker', 'base.line_gap')
  }), [theme])

  const { region: zoomRegion, setRegion, zoomIn, zoomOut } = useMapZoom(mapRef, {
    latitudeDelta: SINGLE_POINT_DELTA,
    longitudeDelta: SINGLE_POINT_DELTA * (width / height)
  })

  // What one point of the map is worth in meters, for the dash on iOS (its pattern is in meters, see `routeLineDash`): from the latitude
  // span of the region the map shows and the map's height. The span is NEVER taken from a map report's payload on iOS (a report can
  // describe a region the map no longer shows, see `routeLineDash`): a programmatic move (the fit, the zoom buttons, locate) sets it from
  // the region it asks for and confirms it with one read of the map when its animation is over, and a report is a reason to read the
  // map (`readMap`). The map's size is the window's until its layout is known; a read that comes before it is divided by the real
  // height once it arrives (`height` 0).
  const [size, setSize] = useState({ width, height, measured: false })
  const [shown, setShown] = useState({ latitudeDelta: SINGLE_POINT_DELTA, height: 0 })
  const scale = useMemo(() => settledScale(metersPerPoint(shown.latitudeDelta, shown.height || size.height)), [shown, size.height])
  const mounted = useRef(true)
  // The newest move or read: an answer of an older one is ignored (reads are asynchronous), as is any after the screen is gone.
  const ticket = useRef(0)
  // A programmatic move waits for its confirmation read: `settling` is its timer, `inFlight` that reports are not read meanwhile (the map
  // is in motion, a read would show a region on its way) until the driver touches the map.
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)

  /** The region the map shows is the scale's from now on (its height is the real one once the layout is known). */
  const adopt = useCallback((region: any) => {
    setRegion(region)
    const next = { latitudeDelta: region.latitudeDelta, height: latest.current.measured ? latest.current.mapHeight : 0 }
    setShown((was) => (was.latitudeDelta === next.latitudeDelta && was.height === next.height ? was : next))
  }, [setRegion])

  /** Reads the region the map shows NOW. `fallback` (a gesture's report) is used only if the map cannot be read. */
  const readMap = useCallback((fallback?: any) => {
    const mine = ++ticket.current
    const map: any = mapRef.current
    const current = () => mounted.current && mine === ticket.current
    let asked: Promise<any>
    try {
      asked = Promise.resolve(map.getMapBoundaries())
    } catch (error) {
      asked = Promise.reject(error)
    }
    asked.then(
      (box) => {
        const region = current() ? regionOfBounds(box) : null
        if (region) adopt(region)
      },
      () => { if (current() && fallback) adopt(fallback) }
    )
  }, [adopt])

  /** A programmatic move was asked: the scale is already its region's; one read confirms it when it would be over. Not a poll: one. */
  const settle = useCallback((animated: boolean) => {
    if (Platform.OS !== 'ios') return
    ticket.current++
    if (settling.current) clearTimeout(settling.current)
    inFlight.current = true
    settling.current = setTimeout(() => {
      settling.current = null
      inFlight.current = false
      readMap()
    }, settleDelay(animated, latest.current.slow))
  }, [readMap])

  /** A move the app asked of the map: its region is what the map will show, for the scale and for the zoom buttons. */
  const moved = useCallback((region: any, animated: boolean) => {
    adopt(region)
    settle(animated)
  }, [adopt, settle])

  // A report of the map (the library's second argument tells whether the driver's own gesture moved it): Android keeps the payload (its
  // scale is not used there, the zoom buttons need the region); iOS reads the map.
  const regionSettled = useCallback((region: any, details?: { isGesture?: boolean }) => {
    if (Platform.OS !== 'ios') {
      adopt(region)
      return
    }
    if (inFlight.current) return
    readMap(details?.isGesture ? region : undefined)
  }, [adopt, readMap])
  const touched = useCallback(() => {
    autoFit.current = false
    // The driver took the map: what it reports from now on is his.
    inFlight.current = false
  }, [])
  /** The screen is gone: no answer is taken and no confirmation is read. */
  const leave = useCallback(() => {
    mounted.current = false
    ticket.current++
    if (settling.current) clearTimeout(settling.current)
    settling.current = null
    inFlight.current = false
  }, [])
  useEffect(() => {
    mounted.current = true
    return leave
  }, [leave])
  const frameLaid = useCallback((event: any) => {
    const { width: laidWidth, height: laidHeight } = event.nativeEvent.layout
    if (!(laidWidth > 0 && laidHeight > 0)) return
    setSize((was) => (was.measured && was.width === laidWidth && was.height === laidHeight ? was : { width: laidWidth, height: laidHeight, measured: true }))
    // A read that came first belongs to the map's real height: it is that one from now on, so a later resize keeps its ground per point.
    setShown((was) => (was.height === 0 ? { ...was, height: laidHeight } : was))
  }, [])

  const points = useMemo<LatLng[]>(() => [...stops.map((stop) => stop.location), ...(driver ? [driver] : [])], [stops, driver])
  // What the camera frames again for: another set of stops, or the first position of the driver. Not his moves.
  const fitKey = `${stops.map((stop) => `${stop.id}@${stop.location.latitude},${stop.location.longitude}`).join('|')}${driver ? '+driver' : ''}`
  const controlsRoom = controlsWidth > 0 ? themeGutter(theme) + controlsWidth + themeSpace(theme, 'sm') : 0
  // The buttons' column is the map's own padding (`mapPadding`), so the markers are framed clear of it.
  // What a camera move reads when it runs (the fit is asked from an effect and from a button): the newest of each, with the move
  // itself stable, so a new theme object or window does not frame the map again.
  const motion = themeMotion(theme, 'base')
  const latest = useRef({ points, animated: false, edge: 0, slow: 0, aspect: 1, sideRoom: 0, mapWidth: width, mapHeight: height, measured: false })
  latest.current = {
    points,
    animated: motion.duration > 0,
    edge: themeSpace(theme, 'xxl'),
    slow: themeMotion(theme, 'slow').duration,
    aspect: width / height,
    sideRoom: controlsRoom,
    mapWidth: size.width,
    mapHeight: size.height,
    measured: size.measured
  }

  const fit = useCallback(() => {
    const { points: framed, animated, edge, slow, sideRoom, mapWidth, mapHeight } = latest.current
    if (!mapRef.current || !framed.length) return
    // What the map will show after this move: the dash's scale and the zoom buttons read it now, and one read of the map confirms it.
    const region = fittedRegion({ points: framed, edge, sideRoom, mapWidth, mapHeight, singleDelta: SINGLE_POINT_DELTA })
    if (!region) return
    // One place (one stop, or stops at the same address) is a region around it, not a fit of a box with no size.
    if (distinctPoints(framed).length === 1) {
      mapRef.current.animateToRegion(region, animated ? slow : 0)
    } else {
      mapRef.current.fitToCoordinates(framed, { edgePadding: { top: edge, right: edge, bottom: edge, left: edge }, animated })
    }
    moved(region, animated)
  }, [moved])

  // The map's size is a reason to frame it again (its height is what the fit divides by), while the driver has not moved it himself.
  useEffect(() => {
    if (ready && autoFit.current) fit()
  }, [ready, fitKey, fit, size.width, size.height])

  /** The fit button: frames the stops and the driver again, and follows the stops from then on. */
  const fitAll = () => {
    autoFit.current = true
    fit()
  }

  /** The locate button: the map goes to the driver, at the zoom it has. */
  const centerOnMe = async () => {
    autoFit.current = false
    const where = driver ?? await getCurrentLocation?.().catch(() => null)
    if (!where || !mapRef.current) return
    const region = { ...where, latitudeDelta: SINGLE_POINT_DELTA, longitudeDelta: SINGLE_POINT_DELTA * latest.current.aspect }
    mapRef.current.animateToRegion(region, latest.current.animated ? latest.current.slow : 0)
    moved(region, latest.current.animated)
  }

  /** The zoom buttons: the library moves the map by half or double the region it knows; the scale takes that region as soon as it is asked. */
  const zoomed = (press: () => void, factor: number) => {
    const was = zoomRegion.current
    if (was.latitude === undefined || was.longitude === undefined) return
    press()
    moved({ ...was, latitudeDelta: was.latitudeDelta * factor, longitudeDelta: was.longitudeDelta * factor }, true)
  }

  const first = stops[0]?.location ?? driver
  // A dash is longer than the line is wide (the theme's `line_dash` against `line_width`), so it reads as a dash and not as a dot;
  // it is a length in points on both platforms (meters at the zoom on iOS, pixels on Android: see `routeLineDash`).
  const pixelRatio = PixelRatio.get()
  const dash = useMemo(() => routeDashPattern(Platform.OS, line.dash, line.gap, scale, pixelRatio), [line.dash, line.gap, scale, pixelRatio])

  return (
    <View style={styles.fill} testID='route-map-frame' onLayout={frameLaid}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={first ? { ...first, latitudeDelta: SINGLE_POINT_DELTA, longitudeDelta: SINGLE_POINT_DELTA * (width / height) } : undefined}
        style={StyleSheet.absoluteFill}
        mapPadding={{ top: 0, right: controlsRoom, left: 0, bottom: 0 }}
        zoomTapEnabled
        zoomEnabled
        // The library's own zoom buttons (Android): the app draws its own, as the other maps do.
        zoomControlEnabled={false}
        // A tap on a marker does not move the map.
        moveOnMarkerPress={false}
        onMapReady={() => setReady(true)}
        onRegionChangeComplete={regionSettled}
        onTouchStart={touched}
      >
        {legs.map((leg) => (
          <Polyline
            key={`${leg.fromStop ?? 'driver'}-${leg.toStop}`}
            coordinates={leg.path}
            // The leg to the next stop is the stronger tone of the same role and wider.
            strokeColor={leg.fromStop === null ? line.nextColor : line.color}
            strokeWidth={leg.fromStop === null ? line.nextWidth : line.width}
            lineDashPattern={dash}
            // Flat ends: the library's default is round, and on Android a round cap draws every dash as a dot.
            lineCap={ROUTE_LINE_CAP}
            lineJoin='round'
          />
        ))}
        {!!driver && (
          <MapMarker party='me' latitude={driver.latitude} longitude={driver.longitude} label={t('YOUR_LOCATION', 'Your Location')} />
        )}
        {stops.map((stop) => (
          <RouteStopMarker
            key={stop.id}
            latitude={stop.location.latitude}
            longitude={stop.location.longitude}
            number={stop.number}
            next={stop.number === 1}
            label={spoken(stop)}
          />
        ))}
      </MapView>
      <View
        style={styles.controls}
        pointerEvents='box-none'
        testID='route-map-controls'
        onLayout={(event) => setControlsWidth(Math.round(event.nativeEvent.layout.width))}
      >
        <MapZoomControls onZoomIn={() => zoomed(zoomIn, 1 / 2)} onZoomOut={() => zoomed(zoomOut, 2)} />
        {themeVisible(theme, 'business_map.recenter') && (
          <View style={styles.fabs}>
            <OFab iconName='globe-sharp' onPress={fitAll} accessibilityLabel={t('FIT_ROUTE', 'Fit the route')} />
            <OFab iconName='locate' onPress={centerOnMe} accessibilityLabel={t('CENTER_ON_MY_POSITION', 'Center on my position')} />
          </View>
        )}
      </View>
    </View>
  )
}

export default RouteMap
