import { useCallback, useEffect, useRef } from 'react'

import { ToastType, useLanguage, useToast } from '@components'

/** How long the hint stays on screen (ms): the same as the "Hold to confirm" hint, which it takes the place of offline. */
export const NO_CONNECTION_HINT_MS = 2000

/**
 * What a tap on a button that is painted off for lack of a connection says (the project does not save changes made offline, so the
 * order's steps wait for the network): one short toast, "No connection. Try again when the network is back.", of the info kind as
 * the hold's hint. The buttons stay off (`OButton`'s `onDisabledPress` is what brings the tap here).
 *
 * At most one toast per tap, and taps on top of one another do not stack: while the hint is still on screen another tap, on this
 * button or on any other of the screen's, shows nothing more. The function is stable.
 */
export const useNoConnectionHint = () => {
  const [, translate] = useLanguage()
  const [, { showToast: show }] = useToast()
  const shownAt = useRef<number | null>(null)
  const latest = useRef({ t: translate, showToast: show })
  latest.current = { t: translate, showToast: show }
  // A screen that goes away takes the memory of its hint with it.
  useEffect(() => () => { shownAt.current = null }, [])

  return useCallback(() => {
    const now = Date.now()
    if (shownAt.current !== null && now - shownAt.current < NO_CONNECTION_HINT_MS) return
    shownAt.current = now
    const { t, showToast } = latest.current
    showToast(ToastType.Info, t('NO_CONNECTION_TRY_LATER', 'No connection. Try again when the network is back.'), NO_CONNECTION_HINT_MS)
  }, [])
}
