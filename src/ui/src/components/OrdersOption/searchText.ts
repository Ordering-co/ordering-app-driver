/**
 * What the orders search sends for a text the driver typed (the order number, the external id).
 *
 * The orders controller (`OrderListGroups`, read-only) wraps the text in `%…%` for an `ilike` and, when the
 * app says it is not iOS, passes it through `encodeURI`, which turns each `%` into `%25` and encodes spaces
 * and accents: that is the path the app asks for (`SEARCH_ENCODES_PERCENT`), because the SDK writes the
 * `where` into the query string as it is, and on iOS a raw `%34` of "%3460%" is read by the server as the
 * character "4" ("460%" was what the API searched).
 *
 * `encodeURI` leaves `&`, `#` and `+` as they are, and in a query string they end the value (`&`, `#`) or
 * become a space (`+`). The text goes through the single character wildcard of `ilike` instead, so the request is
 * whole. The price is that the search is wider than what was typed: "a&b" finds "a&b" and also "axb" (any one
 * character stands where the `&` was). That is accepted over a request that is cut; it only matters for an external id
 * that has one of the three, and the result still holds the order that was asked for. (An upstream `encodeURIComponent`
 * of every query value in the SDK would make the text arrive as typed; until then this is the app's clean way.)
 *
 * `;` and `=` are left as typed: the query string is split at `&` alone and each part at its first `=`, so they travel
 * inside the value whole (they only end a value for a server that takes `;` as a separator, which is not this API's).
 */
export const SEARCH_ENCODES_PERCENT = true

/** The typed text as the search sends it: trimmed, and with the characters a query string would cut as the one-character wildcard. */
export const searchTerm = (text: unknown): string =>
  typeof text === 'string' ? text.trim().replace(/[&#+]/g, '_') : ''
