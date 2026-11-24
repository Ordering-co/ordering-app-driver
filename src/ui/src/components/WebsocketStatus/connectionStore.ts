import { useSyncExternalStore } from 'react'

/**
 * What the connection pill and the connection sheet share. The sheet is hosted once, globally (`ConnectionHost`), so a
 * pill in any header (today the orders list's) only asks for it to open; and "the last update"
 * is one time for all of them: the socket's last connection or the last order event, whichever is newer.
 */
type Listener = () => void
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener: Listener) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

let sheetOpen = false
let lastUpdate: number | null = null

export const openConnectionSheet = () => {
  if (sheetOpen) return
  sheetOpen = true
  emit()
}

export const closeConnectionSheet = () => {
  if (!sheetOpen) return
  sheetOpen = false
  emit()
}

/** Something arrived from the server now (or at `at`): the last update only moves forward. */
export const markConnectionUpdate = (at: number = Date.now()) => {
  if (lastUpdate !== null && at <= lastUpdate) return
  lastUpdate = at
  emit()
}

export const useConnectionSheetOpen = (): boolean => useSyncExternalStore(subscribe, () => sheetOpen)

/** The last time something arrived from the server (ms), or null before anything did. */
export const useLastConnectionUpdate = (): number | null => useSyncExternalStore(subscribe, () => lastUpdate)

/** For tests: back to nothing open and nothing heard. */
export const resetConnectionStore = () => {
  sheetOpen = false
  lastUpdate = null
  emit()
}
