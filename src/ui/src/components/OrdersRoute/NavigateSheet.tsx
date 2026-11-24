import React, { useMemo } from 'react'
import { Platform, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { useOpenContact } from '../../hooks/useOpenContact'
import { OBottomPopup, OButton, OListRow, OText } from '../shared'
import { navigateSheetStyles } from './styles'
import { appleStopUrl, googleRouteStops, googleRouteUrl, googleStopUrl, wazeStopUrl } from './routeLinks'
import type { LatLng } from './routeGeometry'
import { locatedStops, type RouteStop } from './routeStops'
import { useMapsApps } from './useMapsApps'
import { useRouteFormat } from './useRouteFormat'

/**
 * "Open in a maps app": the route sent to the maps app the driver picks, from the route's Navigate button. Coordinates only travel in
 * the links (`routeLinks`), the apps' universal links, opened as the app opens any link (`useOpenContact`: it says so, in the app's own
 * dialog, when the phone cannot open one). One row each for: Google Maps with the whole route (its first 10 stops when the route has
 * more, and the row says so), Google Maps, Waze and (on iOS) Apple Maps with the next stop alone. Nothing here changes when an order
 * does: the maps app keeps the route it was given, which the sheet says.
 */
interface Props {
  open: boolean
  onClose: () => void
  stops: RouteStop[]
  /** The driver's position, the whole route's origin; none leaves it to the maps app (where the phone is). */
  driver: LatLng | null
}

export const NavigateSheet = ({ open, onClose, stops, driver }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const openLink = useOpenContact()
  const format = useRouteFormat()
  const styles = useMemo(() => navigateSheetStyles(theme), [theme])

  const located = useMemo(() => locatedStops(stops), [stops])
  // The next stop is the route's first one: with no location of its own there is no next-stop-only link.
  const next = stops[0]?.location ? stops[0] : null
  const { waze } = useMapsApps(open, next?.location ?? null)

  const rows: Array<{ key: string, icon: string, iconSet?: 'ion' | 'mci', title: string, subtitle: string, url: string }> = []
  const whole = located.length > 1 ? googleRouteUrl(driver, located.map((stop) => stop.location)) : null
  if (whole) {
    const { sent, capped } = googleRouteStops(located)
    rows.push({
      key: 'google_route',
      icon: 'map-marker-path',
      iconSet: 'mci',
      title: t('ROUTE_GOOGLE_WHOLE', 'Google Maps · the whole route'),
      subtitle: (capped ? t('ROUTE_FIRST_STOPS', 'First :count: stops') : t('ROUTE_ALL_STOPS', 'All :count: stops, one after another')).replace(':count:', String(sent.length)),
      url: whole
    })
  }
  if (next?.location) {
    const where = next.address || next.name
    rows.push({ key: 'google_next', icon: 'location-outline', title: t('ROUTE_GOOGLE_NEXT', 'Google Maps · next stop only'), subtitle: where, url: googleStopUrl(next.location) })
    if (waze) {
      rows.push({ key: 'waze_next', icon: 'location-outline', title: t('ROUTE_WAZE_NEXT', 'Waze · next stop only'), subtitle: t('ROUTE_WAZE_ONE_AT_A_TIME', 'Waze takes one destination at a time'), url: wazeStopUrl(next.location) })
    }
    if (Platform.OS === 'ios') {
      rows.push({ key: 'apple_next', icon: 'location-outline', title: t('ROUTE_APPLE_NEXT', 'Apple Maps · next stop only'), subtitle: where, url: appleStopUrl(next.location) })
    }
  }

  const send = (url: string) => {
    onClose()
    openLink(url)
  }

  return (
    <OBottomPopup open={open} onClose={onClose} title={t('ROUTE_OPEN_IN_MAPS', 'Open in a maps app')} padded testID='route-navigate-sheet'>
      <View style={styles.sheet}>
        <OText preset='body_sm' color='text_muted'>
          {t('ROUTE_SHEET_INFO', 'The route as it is now: :stops:, in the order of the delivery positions.').replace(':stops:', format.stopsCount(stops.length))}
        </OText>
        <View>
          {rows.map((row, index) => (
            <OListRow
              key={row.key}
              icon={row.icon}
              iconSet={row.iconSet}
              title={row.title}
              subtitle={row.subtitle}
              last={index === rows.length - 1}
              onPress={() => send(row.url)}
              testID={`route-navigate-${row.key}`}
            />
          ))}
        </View>
        <OText preset='body_sm' color='text_muted'>
          {t('ROUTE_SHEET_NOTE', 'The maps app keeps the route it was given. If an order changes, send the route again.')}
        </OText>
        <OButton color='neutral' appearance='outline' text={t('CANCEL', 'Cancel')} onClick={onClose} testID='route-navigate-cancel' />
      </View>
    </OBottomPopup>
  )
}

export default NavigateSheet
