import {
  capitalize,
  flatArray,
  convertHoursToMinutes,
  getTraduction,
  getGoogleMapImage,
  sortInputFields,
  transformCountryCode,
  findExitingCode,
  verifyDecimals,
  getProductPrice,
  transformDistance,
  formatSeconds,
  calculateDistance,
  getDistance,
  formatUrlVideo,
  getLogisticTag,
  getOrderStatus,
  getOrderStatuPickUp,
  lightenDarkenColor,
  orderCommentList,
  reviewCommentList,
  getCurrenySymbol,
  getTypesText,
  setLocalMoment,
  locale,
  isLocationValidationActive,
  validateLocationForStatus,
  checkLocationRequirements,
  getShowDeliveryPrioritySelection
} from '../index'

const t = (_key: string, fallback?: string) => fallback ?? _key

describe('utils — index', () => {
  it('flatArray flattens nested arrays', () => {
    expect(flatArray([1, [2, 3]])).toEqual([1, 2, 3])
  })

  it('capitalizes strings', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('convertHoursToMinutes formats duration', () => {
    expect(convertHoursToMinutes('1:30')).toBe('90min')
    expect(convertHoursToMinutes(null)).toBe('0min')
  })

  it('getTraduction resolves known and fallback keys', () => {
    expect(getTraduction('ERROR_INVALID_COUPON', t)).toBe("The coupon doesn't exist")
    expect(getTraduction('Custom message', t)).toBe('Custom message')
    expect(getTraduction('SOME_KEY', t)).toBe('Some key')
  })

  it('getGoogleMapImage builds static map url', () => {
    const url = getGoogleMapImage({ lat: 40.7, lng: -74.0 }, 'map-key')
    expect(url).toContain('maps.googleapis.com')
    expect(url).toContain('40.7,-74')
  })

  it('sortInputFields orders fields by configured codes', () => {
    const values = [
      { code: 'email', name: 'Email' },
      { code: 'name', name: 'Name' }
    ]
    expect(sortInputFields({ values })).toEqual([
      { code: 'name', name: 'Name' },
      { code: 'email', name: 'Email' }
    ])
  })

  it('transformCountryCode and findExitingCode resolve phone codes', () => {
    expect(transformCountryCode(1)).toBe('US')
    expect(findExitingCode('us')).toBe('US')
  })

  it('verifyDecimals keeps integers or applies parser', () => {
    expect(verifyDecimals(10, (n: number) => n.toFixed(2))).toBe(10)
    expect(verifyDecimals(10.5, (n: number) => n.toFixed(2))).toBe('10.50')
    expect(verifyDecimals(10.5, (n: number, opts: any) => `${n}-${opts.unit}`, { unit: 'km' })).toBe('10.5-km')
  })

  it('getProductPrice sums options and quantity', () => {
    const price = getProductPrice({
      quantity: 2,
      price: 5,
      options: [{
        suboptions: [{ quantity: 1, price: 2 }]
      }]
    })
    expect(price).toBe(14)
  })

  it('transformDistance converts units', () => {
    expect(transformDistance(1, 'mi')).toBe('0.62')
    expect(transformDistance(1, 'km')).toBe('1.00')
  })

  it('formatSeconds formats elapsed time', () => {
    expect(formatSeconds(65)).toBe('1:05')
    expect(formatSeconds(3665)).toBe('1:01:05')
  })

  it('calculateDistance and getDistance return positive distances', () => {
    expect(calculateDistance({ lat: 0, lng: 0 }, { latitude: 0, longitude: 1 })).toBeGreaterThan(0)
    expect(getDistance(0, 0, 0, 1)).toBeGreaterThan(0)
  })

  it('formatUrlVideo extracts youtube embed id', () => {
    expect(formatUrlVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('getLogisticTag maps status codes', () => {
    expect(getLogisticTag(0, t)).toBe('Pending')
    expect(getLogisticTag(99, t)).toBe('Unknown')
  })

  it('getOrderStatus and getOrderStatuPickUp return status objects', () => {
    expect(getOrderStatus('7', t)?.slug).toBe('ACCEPTED_BY_BUSINESS')
    expect(getOrderStatuPickUp('7', t)?.slug).toBe('ACCEPTED_BY_BUSINESS')
  })

  it('lightenDarkenColor detects light colors', () => {
    expect(lightenDarkenColor('#FFFFFF')).toBe(true)
    expect(lightenDarkenColor('#000000')).toBe(false)
  })

  it('orderCommentList returns reject reasons for driver reject', () => {
    const result = orderCommentList('reject', t)
    expect(result?.list.length).toBeGreaterThan(0)
    expect(orderCommentList('unknown', t)).toBeNull()
  })

  it('reviewCommentList returns product like/dislike lists', () => {
    const product = reviewCommentList('product', t)
    expect(product.like.length).toBeGreaterThan(0)
    expect(product.dislike.length).toBeGreaterThan(0)
  })

  it('getCurrenySymbol resolves currency symbols', () => {
    expect(getCurrenySymbol('USD' as any)).toBeTruthy()
  })

  it('getTypesText resolves order type content', () => {
    expect(getTypesText(1)).toBeTruthy()
  })

  it('setLocalMoment and locale configure moment labels', () => {
    const momentMock = { locale: jest.fn() }
    setLocalMoment(momentMock, t)
    expect(momentMock.locale).toHaveBeenCalled()
    expect(locale({ language: { code: 'en-US' } }, t).name).toBe('en')
  })

  describe('driver location validation helpers', () => {
    it('isLocationValidationActive respects enable flag or distance config', () => {
      expect(isLocationValidationActive({
        location_validation_enabled_status_3: { value: '1' }
      }, 3)).toBe(true)

      expect(isLocationValidationActive({
        location_validation_distance_status_9: { value: '200' }
      }, 9)).toBe(true)

      expect(isLocationValidationActive({}, 3)).toBe(false)
    })

    it('isLocationValidationActive stays off when the enable flag is explicitly disabled', () => {
      expect(isLocationValidationActive({
        location_validation_enabled_status_3: { value: '0' },
        location_validation_distance_status_3: { value: '200' }
      }, 3)).toBe(false)

      expect(isLocationValidationActive({
        location_validation_enabled_status_9: { value: '0' }
      }, 9)).toBe(false)
    })

    it('validateLocationForStatus skips when the enable flag is explicitly disabled', () => {
      expect(validateLocationForStatus(
        { latitude: 0, longitude: 0 },
        { lat: 10, lng: 10 },
        3,
        {
          location_validation_enabled_status_3: { value: '0' },
          location_validation_distance_status_3: { value: '200' }
        }
      )).toEqual({ isValid: true })
    })

    it('validateLocationForStatus skips when validation is inactive', () => {
      expect(validateLocationForStatus(
        { latitude: 0, longitude: 0 },
        { lat: 10, lng: 10 },
        3,
        {}
      )).toEqual({ isValid: true })
    })

    it('validateLocationForStatus flags distance exceeded', () => {
      const result = validateLocationForStatus(
        { latitude: 0, longitude: 0 },
        { lat: 1, lng: 1 },
        3,
        {
          location_validation_enabled_status_3: { value: '1' },
          location_validation_distance_status_3: { value: '50' }
        }
      )
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('DISTANCE_EXCEEDED')
    })
  })

  describe('checkLocationRequirements', () => {
    it('returns valid for statuses that do not require location', async () => {
      await expect(checkLocationRequirements({
        status: 1,
        order: {},
        configs: {},
        t,
        getCurrentLocation: jest.fn()
      })).resolves.toEqual({ valid: true, issues: [], location: null })
    })

    it('returns valid when location validation is disabled', async () => {
      await expect(checkLocationRequirements({
        status: 3,
        order: {},
        configs: {},
        t,
        getCurrentLocation: jest.fn()
      })).resolves.toEqual({ valid: true, issues: [], location: null })
    })

    it('returns location error when GPS lookup fails', async () => {
      const result = await checkLocationRequirements({
        status: 3,
        order: {},
        configs: {
          location_validation_enabled_status_3: { value: '1' }
        },
        t,
        getCurrentLocation: jest.fn().mockRejectedValue(new Error('gps off'))
      })

      expect(result.valid).toBe(false)
      expect(result.issues[0].type).toBe('LOCATION_ERROR')
    })

    it('returns valid when driver is within range of business', async () => {
      const result = await checkLocationRequirements({
        status: 3,
        order: {
          business: { location: { lat: 40.7128, lng: -74.006 } }
        },
        configs: {
          location_validation_enabled_status_3: { value: '1' },
          location_validation_distance_status_3: { value: '5000' }
        },
        t,
        getCurrentLocation: jest.fn(),
        providedLocation: { latitude: 40.7128, longitude: -74.006 }
      })

      expect(result.valid).toBe(true)
      expect(result.issues).toEqual([])
    })
  })

  it('getShowDeliveryPrioritySelection hides only when disable flag is non-zero', () => {
    expect(getShowDeliveryPrioritySelection({})).toBe(true)
    expect(getShowDeliveryPrioritySelection({ disable_delivery_priority: { value: '0' } })).toBe(true)
    expect(getShowDeliveryPrioritySelection({ disable_delivery_priority: { value: '1' } })).toBe(false)
  })
})
