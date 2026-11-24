import { useEffect, useState } from 'react'
import { getApps } from 'react-native-map-link'

import type { LatLng } from './routeGeometry'

/** The apps the route's sheet offers, as the maps library names them (`getApps`' ids). */
const OFFERED_APPS = ['google-maps', 'waze', 'apple-maps']

/**
 * Which of the maps apps the sheet offers are on the phone, asked as the order's map asks it ("Show in other maps": `getApps` of
 * `react-native-map-link`, which the project already declares to both systems: the `LSApplicationQueriesSchemes` of the iOS project and
 * the `<queries>` of the Android manifest). Google Maps and Apple Maps are always offered (Google's link opens the browser when its
 * app is not there; Apple Maps is the iOS system's own); Waze only when it is installed. While the answer is not known, or when the
 * library cannot give one, Waze is offered: its link opens the browser or the store, and no driver is left without it.
 * Asked once each time the sheet opens, with the next stop's coordinates and nothing else.
 */
export const useMapsApps = (open: boolean, stop: LatLng | null): { waze: boolean } => {
  const [installed, setInstalled] = useState<string[] | null>(null)
  const latitude = stop?.latitude
  const longitude = stop?.longitude

  useEffect(() => {
    if (!open || latitude === undefined || longitude === undefined) return undefined
    let current = true
    setInstalled(null)
    Promise.resolve(getApps({ latitude, longitude, alwaysIncludeGoogle: true, appsWhiteList: OFFERED_APPS }))
      .then((apps: Array<{ id: string }>) => { if (current) setInstalled(apps.map((app) => app.id)) })
      .catch(() => { if (current) setInstalled(null) })
    return () => { current = false }
  }, [open, latitude, longitude])

  return { waze: installed === null || installed.includes('waze') }
}
