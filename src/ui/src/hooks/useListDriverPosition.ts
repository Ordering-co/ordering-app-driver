import { useCallback, useRef } from 'react'

import { isPositionFix } from '../utils'
import { useLocation } from './useLocation'

/** The last fix the lists read, kept for the life of the app: a list that is drawn again starts from it, not from "no position". */
let lastFix: any = null

/** For tests: no fix kept. */
export const resetListDriverPosition = () => { lastFix = null }

/**
 * The driver's position for the distances of the orders list: the last fix known, refreshed when the list loads again.
 *
 * - **Kept.** A fix replaces the one kept; what is not a fix (the 0, 0 the location hook starts with, or a failed read) never does, so
 *   the distance never drops to "no distance" while a position is being read. It is kept beyond the screen too (`lastFix`).
 * - **Refreshed** by `refresh()`, one read of the position when the list reloads (its own reload, the pull to refresh, the screen's
 *   focus): no watch and no timer. A read that fails keeps the previous position.
 */
export const useListDriverPosition = () => {
  const { userLocation, getCurrentLocation } = useLocation()
  if (isPositionFix(userLocation)) lastFix = userLocation

  const read = useRef(getCurrentLocation)
  read.current = getCurrentLocation
  const refresh = useCallback(() => {
    try {
      Promise.resolve(read.current?.()).catch(() => {})
    } catch {
      // A read that cannot even start keeps the position as it was.
    }
  }, [])

  return { position: lastFix as { latitude: number, longitude: number } | null, refresh }
}
