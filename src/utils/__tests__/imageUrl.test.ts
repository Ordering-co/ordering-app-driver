import { Platform } from 'react-native'
import { imageUrl } from '../imageUrl'

const CDN = 'https://cloud-assets.orderingplus.com/image/upload/development/abc/logo.png'

describe('imageUrl', () => {
  it('asks the CDN for the shown size times the density, as WebP', () => {
    expect(imageUrl(CDN, { height: 60 }, 3)).toBe(
      'https://cloud-assets.orderingplus.com/image/upload/f_webp,c_limit,h_200/development/abc/logo.png'
    )
  })

  it('rounds up to a step of 50 px and takes width and height', () => {
    expect(imageUrl(CDN, { width: 402, height: 120 }, 2.625)).toContain('/upload/f_webp,c_limit,w_1100,h_350/')
  })

  it('works with the legacy Cloudinary host', () => {
    expect(imageUrl('https://res.cloudinary.com/x/image/upload/v1/a.jpg', { width: 100 }, 2))
      .toBe('https://res.cloudinary.com/x/image/upload/f_webp,c_limit,w_200/v1/a.jpg')
  })

  it('leaves other hosts, empty values and sizeless requests as they are', () => {
    expect(imageUrl('https://example.com/upload/a.jpg', { width: 100 }, 3)).toBe('https://example.com/upload/a.jpg')
    expect(imageUrl(null, { width: 100 }, 3)).toBeUndefined()
    expect(imageUrl(undefined, { width: 100 }, 3)).toBeUndefined()
    expect(imageUrl(CDN, {}, 3)).toBe(CDN)
  })

  it('replaces a transformation the URL already carries (the CDN rejects chained ones)', () => {
    expect(imageUrl('https://cloud-assets.orderingplus.com/image/upload/f_auto,q_auto,w_1600,c_limit/abc/h.jpg', { width: 400 }, 2.75))
      .toBe('https://cloud-assets.orderingplus.com/image/upload/f_webp,c_limit,w_1100/abc/h.jpg')
    // The one the API sends an Android User-Agent.
    expect(imageUrl('https://cloud-assets.orderingplus.com/image/upload/f_auto,q_auto,os_android/abc/h.jpg', { width: 400 }, 2.75))
      .toBe('https://cloud-assets.orderingplus.com/image/upload/f_webp,c_limit,w_1100/abc/h.jpg')
  })

  it('keeps folders and versions that only look like parameters', () => {
    expect(imageUrl('https://cloud-assets.orderingplus.com/image/upload/my_folder/a.jpg', { width: 100 }, 1))
      .toBe('https://cloud-assets.orderingplus.com/image/upload/f_webp,c_limit,w_100/my_folder/a.jpg')
    expect(imageUrl('https://cloud-assets.orderingplus.com/image/upload/v1534194663/a.jpg', { width: 100 }, 1))
      .toBe('https://cloud-assets.orderingplus.com/image/upload/f_webp,c_limit,w_100/v1534194663/a.jpg')
  })

  it('asks the CDN for a format every Android decodes (os_android) on Android', () => {
    const os = Platform.OS
    Platform.OS = 'android'
    try {
      expect(imageUrl(CDN, { height: 60 }, 3)).toBe(
        'https://cloud-assets.orderingplus.com/image/upload/f_webp,c_limit,h_200,os_android/development/abc/logo.png'
      )
      // Cloudinary does not know the CDN's own parameter.
      expect(imageUrl('https://res.cloudinary.com/x/image/upload/v1/a.jpg', { width: 100 }, 2))
        .toBe('https://res.cloudinary.com/x/image/upload/f_webp,c_limit,w_200/v1/a.jpg')
    } finally {
      Platform.OS = os
    }
  })
})
