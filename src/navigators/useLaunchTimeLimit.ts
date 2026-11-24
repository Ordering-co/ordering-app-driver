import { useEffect, useRef, useState } from 'react'

/**
 * How long the launch may wait for the API before the app goes on with what it has cached
 * (decision 2026-11-17, docs/theme/decisions.md). An API that accepts the connection and never
 * answers (a proxy that stalls, a captive network) would otherwise keep the loading page up for
 * as long as it hangs: the shared logic's requests have no client timeout.
 */
export const LAUNCH_TIME_LIMIT_MS = 15000

/** How long the notice of the limit stays up (the toast's own default is 3 s: too short to read as a launch's). */
export const LAUNCH_NOTICE_MS = 8000

/**
 * The launch's fail-safe, held in one place for `RootNavigator`: says when the loading page may
 * leave.
 *
 * - Normally: once the launch is `loaded` (what only the network answers: the order options, the
 *   push setup, the schedule, or no session and its configs) and the permissions are read.
 * - At the limit, counted from the mount of the navigator, and only while the launch has not
 *   opened: as soon as the session is read from the device (storage, never the network): the
 *   gates that wait for an answer open, whatever the API does. Nothing is skipped for good: the
 *   gates stay what they are, so every effect that waits for `loaded` (the push order, the
 *   developer mode check) or for the answers (the push setup, the schedule block, the location
 *   module) runs when the answer comes, exactly as in a normal launch.
 *
 * The limit is a safety net for whatever keeps the page up, not only a silent API: a launch that
 * has `loaded` but whose permissions are still `permissionsLoading` with no system dialog up
 * (`permissionsPrompting` off) is a launch that hangs too, and opens at the limit. A dialog the
 * driver leaves open is not a hang: while one is up the limit does not fire; it is counted again
 * from the time the dialog goes.
 *
 * The timer is one shot: it starts at the mount, a launch that opens before the limit cancels it
 * for good, and `onLimit` runs once when it fires, told whether the launch had `loaded` (the API
 * answered) so the notice can be only for the API.
 */
export const useLaunchTimeLimit = ({
  loaded,
  permissionsLoading,
  permissionsPrompting = false,
  sessionLoading,
  onLimit
}: {
  loaded: boolean
  permissionsLoading: boolean
  /** A system permission dialog is up: waiting for the driver, not for the app. */
  permissionsPrompting?: boolean
  sessionLoading?: boolean
  onLimit?: (state: { loaded: boolean }) => void
}): boolean => {
  const [timedOut, setTimedOut] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onLimitRef = useRef(onLimit)
  onLimitRef.current = onLimit
  // What the timer reads when it fires (its closure is the mount's).
  const stateRef = useRef({ loaded, permissionsPrompting })
  stateRef.current = { loaded, permissionsPrompting }

  useEffect(() => {
    const arm = () => {
      timer.current = setTimeout(() => {
        timer.current = null
        // A dialog the driver is answering holds a launch that has already loaded: count again.
        if (stateRef.current.loaded && stateRef.current.permissionsPrompting) {
          arm()
          return
        }
        setTimedOut(true)
        onLimitRef.current?.({ loaded: stateRef.current.loaded })
      }, LAUNCH_TIME_LIMIT_MS)
    }
    arm()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // The launch has opened on its own: the limit has nothing left to do.
  const opened = loaded && !permissionsLoading
  useEffect(() => {
    if (opened && timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [opened])

  return opened || (timedOut && !sessionLoading)
}
