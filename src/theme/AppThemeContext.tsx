/**
 * The app's single theme provider (styled-components/native), at the top of
 * the tree so everything that paints reads it: screens, toasts, the status
 * bar, the cookie banner.
 *
 * It paints the cached theme of the project (or the build's defaults) from
 * the first frame; <RemoteThemeLoader /> (inside OrderingProvider, where the
 * API root is known) asks for the served theme, caches it and swaps it in.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native'
import { useApi } from '@components'
import { buildAppTheme, type AppTheme, type ThemeEnvelope } from './engine'
import { fetchTheme, readCachedTheme, writeCachedTheme } from './remote'

interface AppThemeState {
  theme: AppTheme
  envelope: ThemeEnvelope | null
  setEnvelope: (envelope: ThemeEnvelope | null) => void
}

const AppThemeContext = createContext<AppThemeState | null>(null)

/** The system's reduce-motion setting, followed while the app runs. */
const useReduceMotion = () => {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive) setReduce(value) }).catch(() => {})
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce)
    return () => { alive = false; subscription.remove() }
  }, [])
  return reduce
}

export const AppThemeProvider = ({ initialEnvelope = null, children }: { initialEnvelope?: ThemeEnvelope | null, children: React.ReactNode }) => {
  const [envelope, setEnvelope] = useState<ThemeEnvelope | null>(initialEnvelope)
  const reduceMotion = useReduceMotion()
  const theme = useMemo(() => {
    const built = buildAppTheme(envelope)
    return reduceMotion ? { ...built, meta: { ...built.meta, reduceMotion } } : built
  }, [envelope, reduceMotion])
  const value = useMemo(() => ({ theme, envelope, setEnvelope }), [theme, envelope])
  return (
    <AppThemeContext.Provider value={value}>
      <StyledThemeProvider theme={theme}>
        {children}
      </StyledThemeProvider>
    </AppThemeContext.Provider>
  )
}

export const useAppTheme = (): AppTheme => {
  const state = useContext(AppThemeContext)
  if (!state) throw new Error('useAppTheme() needs <AppThemeProvider>')
  return state.theme
}

/** Asks for the served theme once per API root and project, and caches it. */
export const RemoteThemeLoader = ({ project, appId }: { project?: string | null, appId?: string }) => {
  const context = useContext(AppThemeContext)
  const setEnvelope = context?.setEnvelope
  const currentRef = useRef(context?.envelope)
  currentRef.current = context?.envelope
  const [ordering] = useApi()
  const root: string | undefined = ordering?.root

  useEffect(() => {
    if (!root || !project || !setEnvelope) return
    let cancelled = false
    fetchTheme({ root, appId }).then((envelope) => {
      if (cancelled || !envelope) return
      // The same theme as the cached one keeps the current object: a new one rebuilt the
      // theme and re-rendered every styled component during the first load.
      const current = currentRef.current
      if (current && JSON.stringify(current) === JSON.stringify(envelope)) return
      setEnvelope(envelope)
      writeCachedTheme(project, envelope)
    })
    return () => { cancelled = true }
  }, [root, project, appId, setEnvelope])
  return null
}

export { readCachedTheme }
