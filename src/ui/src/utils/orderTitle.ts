/**
 * How an order is titled wherever it has a title: the order card's header and the Messages list's rows ("#1049 · Nina Ross":
 * the number with its "#", a separator, a name). One text for one thing: the screens call these and never write the "#" or the
 * separator themselves.
 */
export const ORDER_TITLE_SEPARATOR = ' · '

/** "#1049": the order's number as a title writes it (the id as it is shown: masked in a secure project, or the external id); none without an id. */
export const orderNumberTag = (shownId?: string | number | null): string => {
  const id = String(shownId ?? '')
  return id ? `#${id}` : ''
}

/** The parts of a title that are there, joined by the separator ("#1049 · Nina Ross"; "#1049" alone when it has no name). */
export const joinTitle = (parts: Array<string | number | false | null | undefined>): string =>
  parts.filter(Boolean).join(ORDER_TITLE_SEPARATOR)
