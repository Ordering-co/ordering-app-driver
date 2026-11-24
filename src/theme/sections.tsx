/**
 * A screen's sections in the theme's order: `usePageSections('business')`.
 *
 *   const { render, isVisible, stickyIndex } = usePageSections('business')
 *   <ScrollView stickyHeaderIndices={[stickyIndex('menu', rendered)]}>
 *     {render({ business_header: () => <Header />, menu: () => <Menu /> })}
 *   </ScrollView>
 *
 * Each page renders through `render()`, so the order and the visibility come
 * from the theme; a section of the schema without a renderer (or the reverse)
 * is an error the tests catch. `group` renders only the sections of one block.
 */
import React, { useMemo } from 'react'
import { useTheme } from 'styled-components/native'

export interface PageSection { key: string, visible: boolean }

type Renderer = () => React.ReactNode

export const usePageSections = (page: string) => {
  // The theme of the one provider (styled-components), as every component reads it.
  const theme: any = useTheme()
  return useMemo(() => {
    const sections: PageSection[] = theme.values.pages[page]?.sections ?? []
    const isVisible = (key: string) => sections.some((s) => s.key === key && s.visible)
    const render = (renderers: Record<string, Renderer | undefined>, { group }: { group?: string[] } = {}) =>
      sections
        .filter((s) => s.visible && (!group || group.includes(s.key)))
        .map((s) => {
          const node = renderers[s.key]?.()
          return node == null || node === false ? null : <React.Fragment key={s.key}>{node}</React.Fragment>
        })
    /** The index of a section among the ones rendered (for `stickyHeaderIndices`), or -1. */
    const indexOf = (key: string, rendered: string[]) => rendered.indexOf(key)
    return { sections, isVisible, render, indexOf }
  }, [theme, page])
}
