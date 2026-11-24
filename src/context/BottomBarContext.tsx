import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * The bars pinned to the bottom of the screen (the tab bar, a screen's action bar) tell the
 * toast how tall they are, so the toast (drawn at the root, outside every navigator) rides above
 * them instead of over them. A bar reports its height while it is on screen and takes it back
 * when it leaves; the toast reads the tallest one. Without a provider (a component on its own,
 * a test) a report goes nowhere and the height is 0.
 */
type Report = (id: string, height: number) => void

const HeightContext = createContext(0)
const ReportContext = createContext<Report>(() => {})

export const BottomBarProvider = ({ children }: { children: React.ReactNode }) => {
  const [bars, setBars] = useState<Record<string, number>>({})
  const report = useCallback<Report>((id, height) => {
    setBars((previous) => {
      if ((previous[id] ?? 0) === height) return previous
      const next = { ...previous }
      if (height > 0) next[id] = height
      else delete next[id]
      return next
    })
  }, [])
  const height = useMemo(() => Object.values(bars).reduce((tallest, bar) => Math.max(tallest, bar), 0), [bars])
  return (
    <ReportContext.Provider value={report}>
      <HeightContext.Provider value={height}>{children}</HeightContext.Provider>
    </ReportContext.Provider>
  )
}

/** The height of the tallest bar on screen, its bottom inset included (0 with none). */
export const useBottomBarHeight = (): number => useContext(HeightContext)

/** Reports a bar's height (its bottom inset included) while the component is mounted; `0` reports nothing. */
export const useReportBottomBar = (id: string, height: number) => {
  const report = useContext(ReportContext)
  useEffect(() => {
    report(id, height)
    return () => report(id, 0)
  }, [report, id, height])
}
