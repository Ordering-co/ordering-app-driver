import { PixelRatio, Platform } from 'react-native'

/** The image CDNs that resize on request (`/upload/<transformation>/<path>`). */
const RESIZING_HOSTS = ['cloud-assets.orderingplus.com', 'res.cloudinary.com']

/** Pixel sizes are rounded up to this step, so nearby sizes share the CDN's cache. */
const STEP = 50

export interface ImageSize {
  /** The width the image is shown at, in points. */
  width?: number
  /** The height the image is shown at, in points. */
  height?: number
}

/**
 * Cloudinary's parameters (`w_`, `h_`, `c_`, `f_`, `q_`…) and the CDN's `os_`
 * (the API adds `os_android` for an Android User-Agent): a path segment made
 * only of them is a transformation, not a folder.
 */
const TRANSFORMATION = /^(w|h|c|f|q|g|ar|dpr|fl|e|b|r|x|y|z|a|o|os)_[^,/]+$/
const isTransformation = (segment: string) => segment.split(',').every((token) => TRANSFORMATION.test(token))

const toPixels = (points: number, ratio: number) => Math.ceil((points * ratio) / STEP) * STEP

/**
 * A served image's URL asking the CDN for the size it is shown at: its points
 * times the screen's density (`c_limit`: it only shrinks, never crops or
 * enlarges), as WebP (shown on every Android and iOS, with transparency). A URL
 * of another host comes back as it is; no URL, as undefined.
 *
 * The app's own version of the SDK's `optimizeImage` (which returns the URL
 * unchanged): a header of 2000 px, a logo of 2134 px, downloaded and decoded
 * for a card of 400 or a logo of 60 points.
 */
export const imageUrl = (url: string | null | undefined, size: ImageSize, ratio = PixelRatio.get()): string | undefined => {
  if (!url || typeof url !== 'string') return undefined
  if (!RESIZING_HOSTS.some((host) => url.includes(host))) return url
  const marker = '/upload/'
  const at = url.indexOf(marker)
  if (at === -1) return url
  const parts = ['f_webp', 'c_limit']
  if (size.width) parts.push(`w_${toPixels(size.width, ratio)}`)
  if (size.height) parts.push(`h_${toPixels(size.height, ratio)}`)
  if (parts.length === 2) return url
  // Some Android versions cannot decode AVIF, and the CDN may send it whatever
  // the format asked for: `os_android` makes it pick one every Android shows.
  if (Platform.OS === 'android' && url.includes('cloud-assets.orderingplus.com')) parts.push('os_android')
  const start = at + marker.length
  // A transformation the URL already carries (the API sends some, e.g.
  // `f_auto,q_auto,w_1600,c_limit/`) is replaced: the CDN answers a chained one with 403.
  const rest = url.slice(start)
  const slash = rest.indexOf('/')
  const first = slash === -1 ? '' : rest.slice(0, slash)
  const path = first && isTransformation(first) ? rest.slice(slash + 1) : rest
  return `${url.slice(0, start)}${parts.join(',')}/${path}`
}
