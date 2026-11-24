import React from 'react'
import { ODivider } from '../shared'

type DividerVariant = 'item' | 'section' | 'band'

/**
 * The sections a page rendered (`usePageSections(...).render()`), with the
 * page's separator between them. A section that renders nothing is left out
 * before the separators are placed, so hiding one leaves no line and no gap.
 * `separates(previous, next)` says whether two neighbours get the line
 * (`first` is what the list follows, when it follows something).
 */
export const withDividers = (
  nodes: React.ReactNode[],
  variant: DividerVariant,
  { separates = () => true, first }: { separates?: (previous: string, next: string) => boolean, first?: string } = {}
) => {
  const rendered = nodes.filter((node): node is React.ReactElement => React.isValidElement(node))
  return rendered.flatMap((node, index) => {
    const previous = index === 0 ? first : String(rendered[index - 1].key)
    const next = String(node.key)
    return previous !== undefined && separates(previous, next)
      ? [<ODivider key={`${next}-divider`} variant={variant} />, node]
      : [node]
  })
}
