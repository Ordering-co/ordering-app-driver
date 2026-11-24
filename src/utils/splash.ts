import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import BootSplash from 'react-native-bootsplash'

/**
 * Hides the native launch splash (react-native-bootsplash: iOS's BootSplash.storyboard,
 * Android's BootTheme), fading out. It stays over the app from the first frame until this
 * is called. Hiding it again is harmless. Called by `useSplashHide` (the first screen
 * painted) and by the launch time limit of `RootNavigator` (docs/SPLASH.md "When it hides").
 */
export const hideSplash = () => {
  BootSplash.hide({ fade: true }).catch(() => undefined)
}

/**
 * The longest the splash waits for the first screen to be painted, once the cached theme is
 * read: after it the splash goes anyway, so it never stays up over a tree that lays nothing out.
 */
export const SPLASH_PAINT_FALLBACK_MS = 3000

/** What the loading page tells the splash: it is the first screen, and its logo is (or failed to be) drawn. */
export type SplashLogoSignal = {
  /** The loading page mounted: the splash waits for its logo. Returns what to call when it unmounts. */
  register: () => () => void
  /** The logo is loaded (its pixels are on the view at the next frame), or failed to load: either way the splash may go. */
  settled: () => void
}

const noSignal: SplashLogoSignal = { register: () => () => undefined, settled: () => undefined }

export const SplashLogoContext = createContext<SplashLogoSignal>(noSignal)

/**
 * For the loading page (`src/pages/Splash.tsx`): registers it as the first screen on mount and
 * gives the logo image its `onLoad` / `onError`.
 */
export const useSplashLogo = () => {
  const { register, settled } = useContext(SplashLogoContext)
  useLayoutEffect(() => register(), [register])
  // An image that fails to load must not keep the splash up: `onError` lets it go as `onLoad` does.
  return { onLoad: settled, onError: settled }
}

/**
 * When the native splash may go: not before the first screen is laid out and painted, so the
 * first frame under its fade is the app's own and never a blank one (Android's window is blank
 * between the splash's fade and the first drawn frame on a slow device).
 *
 * `mayHide` is true once the cached theme is read (and, with several projects, the project list).
 * Give `onContainerReady` to the navigation container's `onReady`: it fires when the navigators
 * have mounted; two frames later their views are laid out and drawn. If the first screen is the
 * loading page, whose logo is an image that arrives after those frames, the splash also waits
 * for `logoSignal` (give it to `SplashLogoContext`) to say the logo has loaded: no extra frames
 * are waited after `onLoad`, measured not to be needed (docs/SPLASH.md); an image that fails
 * counts as loaded. A fallback hides it after `SPLASH_PAINT_FALLBACK_MS` whatever happens.
 */
export const useSplashHide = (mayHide: boolean) => {
  const [painted, setPainted] = useState(false)
  // 'none': the first screen is not the loading page; 'waiting': it is, its logo is not drawn yet.
  const [logo, setLogo] = useState<'none' | 'waiting' | 'drawn'>('none')
  const frames = useRef<number[]>([])

  const onContainerReady = useCallback(() => {
    const first = requestAnimationFrame(() => {
      frames.current.push(requestAnimationFrame(() => setPainted(true)))
    })
    frames.current.push(first)
  }, [])

  const logoSignal = useMemo<SplashLogoSignal>(() => ({
    register: () => {
      setLogo(state => (state === 'drawn' ? state : 'waiting'))
      return () => setLogo(state => (state === 'waiting' ? 'none' : state))
    },
    settled: () => setLogo('drawn')
  }), [])

  useEffect(() => () => frames.current.forEach(cancelAnimationFrame), [])

  useEffect(() => {
    if (mayHide && painted && logo !== 'waiting') hideSplash()
  }, [mayHide, painted, logo])

  useEffect(() => {
    if (!mayHide || (painted && logo !== 'waiting')) return
    const timer = setTimeout(hideSplash, SPLASH_PAINT_FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [mayHide, painted, logo])

  return { onContainerReady, logoSignal }
}
