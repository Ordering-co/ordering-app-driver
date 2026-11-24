import { useCallback } from 'react'

import { useAcceptSheet } from '../../hooks/useAcceptSheet'
import { useNoConnectionHint } from '../../hooks/useNoConnectionHint'
import { useRouteSource } from './routeSource'

/**
 * What the order card's quick action needs from the screen it is on, which the route's screens are (it is the same action: the
 * list's own request for a status change, the accept view as a sheet over the screen the driver is on, the one "No connection" hint of
 * the screen, and the redirects to the permissions page and to the order). The sheet is kept at the screen, not in the stop that
 * opened it: the stop goes away as soon as its order moves on, and the sheet must stay while the request runs.
 */
export const useStepHost = (navigation: any) => {
  const { changeOrderStatus } = useRouteSource()
  const { openSheet, sheet } = useAcceptSheet()
  const onOfflineTap = useNoConnectionHint()
  const onNavigationRedirect = useCallback((page: string, params?: any) => {
    if (page) navigation?.navigate?.(page, params)
  }, [navigation])
  return { changeOrderStatus, openAcceptSheet: openSheet, sheet, onOfflineTap, onNavigationRedirect }
}

export type StepHost = ReturnType<typeof useStepHost>
