import { ORDER_TYPES } from '../config/constants';
import { CURRENCY } from '../config/currency'
import { orderStatusEntry } from './orderStatus'

// One text for one thing: the status names, the order type's and the formats.
export * from './orderStatus'
export * from './orderType'
export * from './formats'
export * from './travelTime'
export * from './groupLabel'
export * from './orderTitle'
export * from './phone'
export * from './links'
export * from './languageNames'

export const flatArray = (arr: any) => [].concat(...arr);

/**
 * Function to convert a string in string capitalized
 * @param {string} str string to capitalize
 */
export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

/**
 * List of order type
 */
export const orderTypeList = ['delivery', 'pickup', 'eatin', 'curbside', 'drivethru', 'seatdelivery']


/** The entities an API message carries, by name (the API words some of its texts with HTML entities). */
const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  iexcl: '¡', iquest: '¿', ntilde: 'ñ', Ntilde: 'Ñ', ccedil: 'ç', Ccedil: 'Ç', szlig: 'ß', euro: '€',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù', Agrave: 'À', Egrave: 'È', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
  acirc: 'â', ecirc: 'ê', icirc: 'î', ocirc: 'ô', ucirc: 'û', Acirc: 'Â', Ecirc: 'Ê', Icirc: 'Î', Ocirc: 'Ô', Ucirc: 'Û',
  auml: 'ä', euml: 'ë', iuml: 'ï', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Euml: 'Ë', Iuml: 'Ï', Ouml: 'Ö', Uuml: 'Ü',
  atilde: 'ã', otilde: 'õ', Atilde: 'Ã', Otilde: 'Õ', aring: 'å', Aring: 'Å', aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø',
  ordf: 'ª', ordm: 'º', deg: '°', copy: '©', reg: '®', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
}

/**
 * A text with its HTML entities decoded, named ("&ntilde;", "&amp;") and numeric ("&#243;", "&#xF3;"): API
 * messages can carry them and the app draws plain text. An entity it does not know stays as it came and a
 * text with none is returned as it is. One pass, so "&amp;ntilde;" is "&ntilde;", never "ñ".
 * @param {string} text the message
 */
export const decodeHtmlEntities = (text: string): string => {
  if (typeof text !== 'string' || !text.includes('&')) return text
  return text.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,8}));/g, (whole, dec, hex, name) => {
    if (name) return HTML_ENTITIES[name] ?? whole
    const code = dec ? parseInt(dec, 10) : parseInt(hex, 16)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })
}

/**
 * Function to return the traduction depending of a key 't'. The text is decoded of its HTML entities here:
 * every message of the API goes through this function (`apiErrorText` and the toast too).
 * @param {string} key for traduction
 */
export const getTraduction = (key: string, t: any) => {
  const text = traductionOf(key, t)
  return typeof text === 'string' ? decodeHtmlEntities(text) : text
}

const traductionOf = (key: string, t: any) => {
  const keyList: any = {
    // Add the key and traduction that you need below
    ERROR_ORDER_WITHOUT_CART: 'The order was placed without a cart',
    ERROR_INVALID_COUPON: "The coupon doesn't exist",
    ERROR_IVALID_COUPON_MINIMUM:
      'You must have more products in your cart to use the coupon',
    ERROR_ADD_PRODUCT_VERY_FAR_FOR_PICKUP:
      'The business is too far for order type pickup',
    ERROR_PLACE_PAY_WITH_CARD2: 'An error occurred while trying to pay by card',
    ERROR_ADD_PRODUCT_BUSINESS_CLOSED: 'The business is closed at the moment',
    INTERNAL_ERROR: 'Server Error, please wait, we are working to fix it',
    ERROR_NOT_FOUND_BUSINESSES: 'No businesses found near your location',
    YOU_DO_NOT_HAVE_PERMISSION: 'You do not have permission',
    INVALID_CODE: 'Invalid verify code',
    STRIPE_ERROR: 'Payment service error. Try again later.',
    ERROR_AUTH_TWILIO_DISABLED: 'Auth error, twilio is disabled',
    ERROR_CART_SELECT_PAYMETHOD: 'An error occurred with selected pay method',
    ERROR_YOU_HAVE_ACTIVE_CART: "You can't reorder this cart",
    ERROR_YOU_HAVE_NOT_CART: 'Cart not found',
    ERROR_PLACE_PAY_WITH_REDIRECT:
      'An error occurred while trying to pay by redirect',
    ERROR_PLACE_PAY_WITH_CARD1: 'An error occurred while trying to pay by card',
    ERROR_PLACE_PAY_WITH_PAYPAL_CAPTURE:
      'An error occurred while trying to pay by PayPal',
    ERROR_ADD_PRODUCT_VERY_FAR_FOR_DELIVERY:
      'Error adding product, very far for delivery',
    ERROR_PRODUCT_NOT_FOUND: 'Error with the product',
    ERROR_USER_UPDATE_YOU_HAVE_ASSIGNED_ORDERS:
      "You can't because you have assigned orders",
    ERROR_INVALID_OFFER: 'The offer doesn\'t exist',
    // The driver's schedule refused the login: the words of the schedule-blocked screen.
    ERROR_AUTH_DRIVER_LOGIN_VALIDATION: t('OUTSIDE_ESTABLISHED_SCHEDULE', 'You are outside the established schedule'),
    ERROR_DRIVER_UPDATE_SCHEDULE: 'Error driver update schedule',
    ERROR_ADD_BUSINESS_INVALID: 'An error occurred with the business',
    ERROR_ADD_PRODUCT_BEFORE_ADDRESS: 'You must have an address',
    ERROR_USER_FIND: 'User not found',
    ERROR_STRIPE_CONNECT_PAYOUTS_DISABLED: 'Payouts with Stripe are not enabled',
    ERROR_STRIPE_CONNECT_BAD_SETTINGS: 'Stripe is not set up correctly, contact your administrator',
    ERROR_STRIPE_CONNECT_ONBOARDING: 'The Stripe form could not be created. Try again later.'
  };
  return keyList[key]
    ? t(key, keyList[key])
    : (typeof key === 'string')
      ? (/^[^\s]*_[^\s]*$/.test(key))
        ? t(key, capitalize(key.replace(/_/g, ' ').toLowerCase()))
        : t(key.replace(/ /g, '_').toUpperCase(), key)
      : null
};

/**
 * The first message of what an API answer or a controller's state holds: a text, `{ message }`, or a list of them.
 * Empty when there is none; "undefined" and "null" are not messages.
 * @param {any} source the message, a list of them or nothing
 */
export const messageText = (source: any): string => {
  const first = Array.isArray(source) ? source[0] : source
  const message = typeof first === 'string' ? first : first?.message
  if (typeof message !== 'string') return ''
  const text = message.trim()
  return text === 'undefined' || text === 'null' ? '' : text
}

/**
 * The text of an API error to show a driver: the first message of an error list (a string, or
 * `{ message }`), written by `getTraduction` and never as a raw code ("ERROR_ORDER_FIND"); the
 * network error when there is none.
 * @param {any} error the error of a controller's state: a message, a list of them, or nothing
 * @param {function} t the language function
 */
export const apiErrorText = (error: any, t: any): string => {
  const message = messageText(error)
  if (!message) return t('NETWORK_ERROR', 'Network Error')
  // Codes the app words itself (the project's own translations have no entry for them).
  const worded: Record<string, string> = {
    ERROR_ORDER_FIND: t('ERROR_ORDER_FIND', 'Order not found'),
  }
  return worded[message] ?? getTraduction(message, t)
}

/**
 * Function to convert delivery time in minutes
 * @param {string} time business delivery time
 */
export const convertHoursToMinutes = (time: any) => {
  if (!time) return '0min';
  const [hour, minute] = time.split(':');
  const result = parseInt(hour, 10) * 60 + parseInt(minute, 10);
  return `${result}min`;
};

/**
 * Function to return a static google maps image based in location
 * @param {object} param object with latitude and logitude
 */
export const getGoogleMapImage = ({ lat, lng }: any, apiKey: string) => {
  return `https://maps.googleapis.com/maps/api/staticmap?size=500x190&center=${lat},${lng}&zoom=17&scale=2&maptype=roadmap&&markers=icon:https://res.cloudinary.com/ditpjbrmz/image/upload/f_auto,q_auto,w_45,q_auto:best,q_auto:best/v1564675872/marker-customer_kvxric.png%7Ccolor:white%7C${lat},${lng}&key=${apiKey}`;
};
/**
 * List of fields with correct order
 */
export const fieldsToSort = [
  'name',
  'middle_name',
  'lastname',
  'second_lastname',
  'email',
];
/**
 * Function to return a array sorted by certain fields
 * @param fields Array with right order
 * @param array Array to sort
 */
export const sortInputFields = ({ fields, values }: any) => {
  let fieldsBase = fields;
  const fieldsSorted: any = [];
  const fieldsArray = Array.isArray(values)
    ? values
    : values && Object.values(values);

  if (!fieldsBase) {
    fieldsBase = fieldsToSort;
  }

  fieldsBase.forEach((f: any) => {
    fieldsArray &&
      fieldsArray.forEach((field: any) => {
        if (f === field.code) {
          fieldsSorted.push(field);
        }
      });
  });
  return fieldsSorted;
};

/**
 * Function to check if a number is decimal or not
 * @param {*} value number to check if decimal or not
 * @param {*} parser function fallback when is decimal
 * @returns string
 */
export const verifyDecimals = (value: number, parser: any, options?: any) => {
  if (value % 1 === 0) {
    return value;
  } else {
    return options ? parser(value, options) : parser(value);
  }
};

export const getProductPrice = (product: any) => {
  let subOptionPrice = 0;
  if (product.options.length > 0) {
    for (const option of product.options) {
      for (const suboption of option.suboptions) {
        subOptionPrice += suboption.quantity * suboption.price;
      }
    }
  }

  const price = product.quantity * (product.price + subOptionPrice);
  return price;
};

export const transformDistance = (value: number, distanceUnit?: string) => {
  return distanceUnit === 'mi'
    ? (value / 1.609).toFixed(2)
    : distanceUnit === 'ft'
      ? (value * 3280.84).toFixed(0)
      : (value).toFixed(2)
}

/** @deprecated A code's countdown is `formatCountdown` (always `mm:ss`). */
export const formatSeconds = (seconds: number) => {
  // Hours, minutes and seconds
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  // Output like '1:01' or '4:03:59' or '123:03:59'
  let ret = ''
  if (hrs > 0) {
    ret += '' + hrs + ':' + (mins < 10 ? '0' : '')
  }
  ret += '' + mins + ':' + (secs < 10 ? '0' : '')
  ret += '' + secs
  return ret
}

export const calculateDistance = (
  pointA: { lat: number; lng: number },
  pointB: { latitude: number; longitude: number },
) => {
  const lat1 = pointA.lat;
  const lon1 = pointA.lng;

  const lat2 = pointB?.latitude;
  const lon2 = pointB?.longitude;

  const R = 6371e3;
  const φ1 = lat1 * (Math.PI / 180);
  const φ2 = lat2 * (Math.PI / 180);
  const Δφ = (lat2 - lat1) * (Math.PI / 180);
  const Δλ = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * (Math.sin(Δλ / 2) * Math.sin(Δλ / 2));

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  const distanceInKm = distance / 1000;
  return distanceInKm;
};

export interface LocationValidationResult {
  isValid: boolean;
  distance?: number;
  maxDistance?: number;
  error?: string;
}

/**
 * `location_validation_enabled_status_{status}` is authoritative whenever it carries a value:
 * turning it off disables the check even if a distance threshold was left behind.
 * Only when the flag is unset does `location_validation_distance_status_{status}` turn it on,
 * keeping the driver-side check in sync with what the backend enforces.
 */
export const isLocationValidationActive = (configs: any, status: number): boolean => {
  const enabledRaw = configs?.[`location_validation_enabled_status_${status}`]?.value;
  const enabledIsSet = enabledRaw !== undefined && enabledRaw !== null && enabledRaw !== '';

  if (enabledIsSet) {
    return enabledRaw === '1' || enabledRaw === 1 || enabledRaw === true;
  }

  const distanceRaw = configs?.[`location_validation_distance_status_${status}`]?.value;
  return (
    distanceRaw !== undefined &&
    distanceRaw !== null &&
    distanceRaw !== '' &&
    !Number.isNaN(Number(distanceRaw))
  );
};

/**
 * Validates the driver's current location against the target (business/customer) for a given status.
 * Distance threshold is read from `location_validation_distance_status_{status}` (meters, default 100).
 */
export const validateLocationForStatus = (
  currentLocation: { latitude: number; longitude: number },
  targetLocation: { lat: number; lng: number },
  status: number,
  configs: any
): LocationValidationResult => {
  const enabled = isLocationValidationActive(configs, status);
  if (!enabled) {
    return { isValid: true };
  }

  const maxDistance = parseInt(
    configs?.[`location_validation_distance_status_${status}`]?.value || '100',
    10
  );

  const distanceKm = calculateDistance(targetLocation, currentLocation);
  const distanceMeters = distanceKm * 1000;

  if (distanceMeters > maxDistance) {
    return {
      isValid: false,
      error: 'DISTANCE_EXCEEDED',
      distance: Math.round(distanceMeters),
      maxDistance
    };
  }

  return { isValid: true, distance: Math.round(distanceMeters), maxDistance };
};

interface ValidationCallbacks {
  onRefreshLocation?: () => Promise<any>;
  onOpenSettings?: () => void;
  onCloseModal?: () => void;
  onRevalidate?: (newLocation: any) => void;
  showToast?: (type: any, message: string) => void;
}

interface ValidationParams {
  status: number;
  order: any;
  configs: any;
  t: (key: string, defaultValue: string) => string;
  getCurrentLocation: () => Promise<any>;
  providedLocation?: any;
  callbacks?: ValidationCallbacks;
  ToastType?: any;
}

/**
 * Runs the full location-requirements check for a status change (statuses 3, 9, 11, 26).
 * Returns { valid, issues, location } where issues[] is consumed by ValidationIssuesList.
 */
export const checkLocationRequirements = async ({
  status,
  order,
  configs,
  t,
  getCurrentLocation,
  providedLocation,
  callbacks = {},
  ToastType
}: ValidationParams): Promise<{ valid: boolean; issues: any[]; location?: any }> => {
  const statusesRequiringLocation = [3, 9, 11, 26];

  if (!statusesRequiringLocation.includes(status)) {
    return { valid: true, issues: [], location: null };
  }

  const validationEnabled = isLocationValidationActive(configs, status);
  if (!validationEnabled) {
    return { valid: true, issues: [], location: null };
  }

  const issues: any[] = [];

  let currentLocation = providedLocation || null;
  try {
    if (!currentLocation) {
      currentLocation = await getCurrentLocation();
    }
  } catch (error) {
    issues.push({
      type: 'LOCATION_ERROR',
      message: t('ERROR_GETTING_LOCATION_DETAILED',
        'Cannot get current location. Please make sure GPS/Location Services is enabled and the app has location permissions.'),
      action: callbacks.onOpenSettings ? () => {
        callbacks.onCloseModal?.();
        setTimeout(() => {
          callbacks.onOpenSettings?.();
        }, 300);
      } : null,
      actionText: t('GO_TO_SETTINGS', 'Go to settings')
    });
    return { valid: false, issues, location: null };
  }

  if (currentLocation.timestamp) {
    const maxMinutesConfigKey = `location_validation_validity_status_${status}`;
    const maxMinutes = parseInt(configs?.[maxMinutesConfigKey]?.value || '5', 10);
    const minutesAgo = (Date.now() - currentLocation.timestamp) / 1000 / 60;

    if (minutesAgo > maxMinutes) {
      issues.push({
        type: 'LOCATION_EXPIRED',
        message: t('ERROR_DRIVER_LOCATION_EXPIRED',
          'Your location is outdated (_time_ min ago). Please wait a moment and try again.'
        ).replace('_time_', Math.round(minutesAgo).toString()),
        action: callbacks.onRefreshLocation ? async () => {
          try {
            const newLocation = await callbacks.onRefreshLocation?.();
            if (callbacks.showToast && ToastType) {
              callbacks.showToast(ToastType.Info, t('LOCATION_REFRESHED', 'Location refreshed successfully'));
            }
            if (callbacks.onRevalidate) {
              callbacks.onRevalidate(newLocation);
            } else {
              callbacks.onCloseModal?.();
            }
          } catch (error) {
            if (callbacks.showToast && ToastType) {
              callbacks.showToast(ToastType.Error, t('ERROR_GETTING_LOCATION', 'Error getting current location'));
            }
          }
        } : null,
        actionText: t('REFRESH_LOCATION', 'Refresh Location')
      });
    }
  }

  let targetLocation = null;
  if (status === 3 || status === 9) {
    targetLocation = { lat: order?.business?.location?.lat, lng: order?.business?.location?.lng };
  } else if (status === 11 || status === 26) {
    targetLocation = { lat: order?.customer?.location?.lat, lng: order?.customer?.location?.lng };
  }

  if (!targetLocation || !targetLocation.lat || !targetLocation.lng) {
    issues.push({
      type: 'NO_TARGET',
      message: t('ERROR_TARGET_LOCATION_NOT_FOUND', 'Target location not found'),
      action: null,
      actionText: null
    });
  } else {
    const validationResult = validateLocationForStatus(
      currentLocation,
      targetLocation,
      status,
      configs
    );

    if (!validationResult.isValid) {
      const locationTarget = status === 3 || status === 9
        ? t('BUSINESS', 'business')
        : t('CUSTOMER', 'customer');

      const distanceKm = (validationResult.distance || 0) / 1000;
      const thresholdMeters = validationResult.maxDistance || 0;

      let friendlyMessage;
      if (distanceKm >= 1) {
        friendlyMessage = t('ERROR_TOO_FAR_KM',
          'You are _distance_ km away from the _target_. You need to be within _threshold_ meters to continue.'
        )
          .replace('_distance_', distanceKm.toFixed(1))
          .replace('_target_', locationTarget)
          .replace('_threshold_', thresholdMeters.toString());
      } else {
        friendlyMessage = t('ERROR_TOO_FAR_METERS',
          'You are _distance_ meters away from the _target_. You need to be within _threshold_ meters to continue.'
        )
          .replace('_distance_', Math.round(validationResult.distance || 0).toString())
          .replace('_target_', locationTarget)
          .replace('_threshold_', thresholdMeters.toString());
      }

      issues.push({
        type: 'DISTANCE_EXCEEDED',
        message: friendlyMessage,
        action: null,
        actionText: null
      });
    }
  }

  return { valid: issues.length === 0, issues, location: currentLocation };
};


/**
 * Change local moment variables
 */
export const setLocalMoment = (moment: any, t: any) => {
  moment.locale('custom', {
    months: [
      t('MONTH1', 'January'),
      t('MONTH2', 'February'),
      t('MONTH3', 'March'),
      t('MONTH4', 'April'),
      t('MONTH5', 'May'),
      t('MONTH6', 'June'),
      t('MONTH7', 'July'),
      t('MONTH8', 'August'),
      t('MONTH9', 'September'),
      t('MONTH10', 'October'),
      t('MONTH11', 'November'),
      t('MONTH12', 'December')
    ],
    monthsShort: [
      t('MONTHSHORT1', 'Jan'),
      t('MONTHSHORT2', 'Feb'),
      t('MONTHSHORT3', 'Mar'),
      t('MONTHSHORT4', 'Apr'),
      t('MONTHSHORT5', 'May'),
      t('MONTHSHORT6', 'Jun'),
      t('MONTHSHORT7', 'Jul'),
      t('MONTHSHORT8', 'Aug'),
      t('MONTHSHORT9', 'Sep'),
      t('MONTHSHORT10', 'Oct'),
      t('MONTHSHORT11', 'Nov'),
      t('MONTHSHORT12', 'Dec')
    ],
    weekdays: [
      t('DAY7', 'Sunday'),
      t('DAY1', 'Monday'),
      t('DAY2', 'Tuesday'),
      t('DAY3', 'Wednesday'),
      t('DAY4', 'Thursday'),
      t('DAY5', 'Friday'),
      t('DAY6', 'Saturday')
    ],
    weekdaysShort: [
      t('DAYSHORT7', 'Sun'),
      t('DAYSHORT1', 'Mon'),
      t('DAYSHORT2', 'Tue'),
      t('DAYSHORT3', 'Wed'),
      t('DAYSHORT4', 'Thu'),
      t('DAYSHORT5', 'Fri'),
      t('DAYSHORT6', 'Sat')
    ],
    weekdaysMin: [
      t('DAYMIN7', 'Su'),
      t('DAYMIN1', 'Mo'),
      t('DAYMIN2', 'Tu'),
      t('DAYMIN3', 'We'),
      t('DAYMIN4', 'Th'),
      t('DAYMIN5', 'Fr'),
      t('DAYMIN6', 'Sa')
    ],
    meridiem: function (hours: any) {
      return hours < 12 ? t('AM', 'AM') : t('PM', 'PM');
    }
  })
}

export const monthsEnum: any = {
  Jan: 'MONTHSHORT1',
  Feb: 'MONTHSHORT2',
  Mar: 'MONTHSHORT3',
  Apr: 'MONTHSHORT4',
  May: 'MONTHSHORT5',
  Jun: 'MONTHSHORT6',
  Jul: 'MONTHSHORT7',
  Aug: 'MONTHSHORT8',
  Sep: 'MONTHSHORT9',
  Oct: 'MONTHSHORT10',
  Nov: 'MONTHSHORT11',
  Dec: 'MONTHSHORT12',
}

export const locale = (languageState: any, t: any) => {
  return {
    name: languageState?.language?.code?.slice(0, 2),
    config: {
      months: [
        t('MONTH1', 'January'),
        t('MONTH2', 'February'),
        t('MONTH3', 'March'),
        t('MONTH4', 'April'),
        t('MONTH5', 'May'),
        t('MONTH6', 'June'),
        t('MONTH7', 'July'),
        t('MONTH8', 'August'),
        t('MONTH9', 'September'),
        t('MONTH10', 'October'),
        t('MONTH11', 'November'),
        t('MONTH12', 'December')
      ],
      weekdaysShort: [
        t('DAYSHORT7', 'Sun'),
        t('DAYSHORT1', 'Mon'),
        t('DAYSHORT2', 'Tue'),
        t('DAYSHORT3', 'Wed'),
        t('DAYSHORT4', 'Thu'),
        t('DAYSHORT5', 'Fri'),
        t('DAYSHORT6', 'Sat')
      ],
    }
  }
}

export const getTypesText = (value: number) => {
  const ret = ORDER_TYPES.find((type: any) => type.value == value);
  return ret?.content;
}

/**
 * List shape for ribbon
 */
export const shape = {
  rectangle: 'rectangle',
  rectangleRound: 'rectangle_round',
  capsuleShape: 'capsule_shape'
}

/**
 * Function to transform degree to radian
 * @param {number} value for transform
 *
 */
export const convertToRadian = (value: number) => {
  return value * Math.PI / 180
}

/**
 * Function to distance between two locations
 * @param lat1 Lat for first location
 * @param lon1 Lon for first location
 * @param lat2 Lat for second location
 * @param lon2 Lon for second location
 */
export const getDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {
  const R = 6371 // km
  const dLat = convertToRadian(lat2 - lat1)
  const dLon = convertToRadian(lon2 - lon1)
  const curLat1 = convertToRadian(lat1)
  const curLat2 = convertToRadian(lat2)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(curLat1) * Math.cos(curLat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const formatUrlVideo = (url: string) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  const id = (match && match[7].length === 11) ? match[7] : false
  return `https://www.youtube-nocookie.com/embed/${id}`
}

/**
 * List of price to filter businesses
 */
export const priceList = [
  { level: '1', content: '$' },
  { level: '2', content: '$$' },
  { level: '3', content: '$$$' },
  { level: '4', content: '$$$$' },
  { level: '5', content: '$$$$$' }
]

export const getLogisticTag = (status: any, t: any) => {
  const keyList: any = {
    0: t('PENDING', 'Pending'),
    1: t('IN_PROGRESS', 'In progress'),
    2: t('IN_QUEUE', 'In queue'),
    3: t('EXPIRED', 'Expired'),
    4: t('RESOLVED', 'Resolved'),
  }
  return keyList[status] ? keyList[status] : t('UNKNOWN', 'Unknown')
}

/**
 * A status of the app's one list of status names (`orderStatusList`), by its
 * number: `{ key, value, text, slug, percentage }`.
 */
export const getOrderStatus = (s: string, t: any) => orderStatusEntry(t, s)

/** How far a pickup order is at each status it goes through, from 0 to 1. */
const PICKUP_PERCENTAGES: Record<number, number> = {
  0: 0.1,
  1: 1,
  2: 0,
  4: 0.5,
  5: 0,
  7: 0.3,
  13: 0,
  14: 0.3,
  15: 1,
  16: 0,
  17: 0,
  20: 0.7,
  21: 0.9
}

/** A status of a pickup order: its name of the one list, with the pickup's own progress. */
export const getOrderStatuPickUp = (s: any, t: any) => {
  const status = orderStatusEntry(t, s)
  if (!status || PICKUP_PERCENTAGES[status.key] === undefined) return undefined
  return { ...status, percentage: PICKUP_PERCENTAGES[status.key] }
}

/**
 * Function to get brightness of color.
 */
export const lightenDarkenColor = (color: any) => {

  let r, g, b, hsp
  if (!color) return
  if (color.match(/^rgb/)) {
    // If HEX --> store the red, green, blue values in separate variables
    color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/)

    r = color[1]
    g = color[2]
    b = color[3]
  } else {
    // If RGB --> Convert it to HEX
    color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, '$&$&'))

    r = color >> 16
    g = color >> 8 & 255
    b = color & 255
  }

  // HSP (Highly Sensitive Poo) equation
  hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  )

  // Using the HSP value, determine whether the color is light or dark
  if (hsp > 197) {
    return true //is light color
  } else {
    return false
  }
}

/**
 * function to manage order comment list
 * @param {string} param0 type of orders to return
 * @returns object with orders dictionary
 */
export const orderCommentList = (value: string, t: any) => {
  const dictionary: any = {
    reject: 6,
    forcePickUp: 9,
    pickupFailed: 10,
    forceDelivery: 11,
    deliveryFailed: 12,
    notReady: 14
  }

  const status = dictionary[value]

  const messages: any = {
    6: [// on reject order
      'very_far_away',
      'driver_vehicle_incident',
      'destination_unreacheable',
      'unavailable_driver',
      'other'
    ],
    9: [// on force pickup status
      'forgot_complete_location',
      'not_internet_conection',
      'other'
    ],
    10: [// on pickup failed by driver
      'very_far_away',
      'driver_vehicle_incident',
      'destination_unreacheable',
      'store_closed',
      'unavailable_driver',
      'other'
    ],
    11: [// on force delivery status
      'forgot_complete_location',
      'not_internet_conection',
      'other'
    ],
    12: [// on delivery failed by driver
      'very_far_away',
      'driver_vehicle_incident',
      'destination_unreacheable',
      'recipient_unavailable',
      'incorrect_missing_items',
      'refused_damage',
      'other'
    ],
    14: [// on order not ready
      'store_recieve_order_late',
      'store_busy',
      'other'
    ]
  }

  if (!messages[status]) return null

  const list = messages[status].map((val: any, i: number) => ({ key: i, value: val, content: t(`REJECT_REASON_${val.toUpperCase()}`, val.replace(/_/g, ' ')) }))

  return { list }
}

/**
 * function to manage review comment list
 * @param {number} param0 type of reviews to return
 * @returns object with reviews dictionary
 */
export const reviewCommentList = (type: string, t: any) => {
  // TODO: improve this function
  const reviews: any = {
    order: {
      1: {
        title: t('QUICK_COMMENT_TITLE_1', "What went wrong?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_1_0', "Not handled with care") },
          { key: 1, content: t('QUICK_COMMENT_1_1', "Poor communication") },
          { key: 2, content: t('QUICK_COMMENT_1_2', "COVID-19 issue") },
          { key: 3, content: t('QUICK_COMMENT_1_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_1_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_1_5', "Not on-time") },
        ]
      },
      2: {
        title: t('QUICK_COMMENT_TITLE_2', "What went wrong?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_2_0', "Not handled with care") },
          { key: 1, content: t('QUICK_COMMENT_2_1', "Poor communication") },
          { key: 2, content: t('QUICK_COMMENT_2_2', "COVID-19 issue") },
          { key: 3, content: t('QUICK_COMMENT_2_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_2_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_2_5', "Not on-time") },
        ]
      },
      3: {
        title: t('QUICK_COMMENT_TITLE_3', "What could have been better?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_3_0', "Not handled with care") },
          { key: 1, content: t('QUICK_COMMENT_3_1', "Poor communication") },
          { key: 2, content: t('QUICK_COMMENT_3_2', "COVID-19 issue") },
          { key: 3, content: t('QUICK_COMMENT_3_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_3_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_3_5', "Not on-time") },
        ]
      },
      4: {
        title: t('QUICK_COMMENT_TITLE_4', "Tell us more"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_4_0', "Good communication") },
          { key: 1, content: t('QUICK_COMMENT_4_1', "Followed instructions") },
          { key: 2, content: t('QUICK_COMMENT_4_2', "Friendly") },
          { key: 3, content: t('QUICK_COMMENT_4_3', "Didn't follow instructions") },
          { key: 4, content: t('QUICK_COMMENT_4_4', "Rude") },
          { key: 5, content: t('QUICK_COMMENT_4_5', "Not on-time") },
        ]
      },
      5: {
        title: t('QUICK_COMMENT_TITLE_5', "What went well?"),
        list: [
          { key: 0, content: t('QUICK_COMMENT_5_0', "Good communication") },
          { key: 1, content: t('QUICK_COMMENT_5_1', "Followed instructions") },
          { key: 2, content: t('QUICK_COMMENT_5_2', "Friendly") },
          { key: 3, content: t('QUICK_COMMENT_5_3', 'Handled with care') },
          { key: 4, content: t('QUICK_COMMENT_5_4', "Above and beyond") },
        ]
      },
    },
    customer: {
      1: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_1', "What went wrong?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_1_0', "Poor communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_1_1', "Wrong address") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_1_2', "COVID-19 issue") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_1_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_1_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_1_5', "Not on-time") },
        ]
      },
      2: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_2', "What went wrong?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_2_0', "Poor communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_2_1', "Wrong address") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_2_2', "COVID-19 issue") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_2_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_2_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_2_5', "Not on-time") },
        ]
      },
      3: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_3', "What could have been better?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_3_0', "Poor communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_3_1', "Wrong address") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_3_2', "COVID-19 issue") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_3_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_3_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_3_5', "Not on-time") },
        ]
      },
      4: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_4', "Tell us more"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_4_0', "Good communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_4_1', "Followed instructions") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_4_2', "Friendly") },
          { key: 3, content: t('CUSTOMER_QUICK_COMMENT_4_3', "Didn't follow instructions") },
          { key: 4, content: t('CUSTOMER_QUICK_COMMENT_4_4', "Rude") },
          { key: 5, content: t('CUSTOMER_QUICK_COMMENT_4_5', "Not on-time") },
        ]
      },
      5: {
        title: t('CUSTOMER_QUICK_COMMENT_TITLE_5', "What went well?"),
        list: [
          { key: 0, content: t('CUSTOMER_QUICK_COMMENT_5_0', "Good communication") },
          { key: 1, content: t('CUSTOMER_QUICK_COMMENT_5_1', "Friendly") },
          { key: 2, content: t('CUSTOMER_QUICK_COMMENT_5_2', "Above and beyond") },
        ]
      },
    },
    driver: {
      1: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_1', "What went wrong?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_1_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_1_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_1_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_1_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_1_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_1_5', "Not on-time") },
        ]
      },
      2: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_2', "What went wrong?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_2_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_2_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_2_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_2_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_2_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_2_5', "Not on-time") },
        ]
      },
      3: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_3', "What could have been better?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_3_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_3_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_3_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_3_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_3_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_3_5', "Not on-time") },
        ]
      },
      4: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_4', "Tell us more"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_4_0', "Not handled with care") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_4_1', "Poor communication") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_4_2', "COVID-19 issue") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_4_3', "Didn't follow instructions") },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_4_4', "Rude") },
          { key: 5, content: t('DRIVER_QUICK_COMMENT_4_5', "Not on-time") },
        ]
      },
      5: {
        title: t('DRIVER_QUICK_COMMENT_TITLE_5', "What went well?"),
        list: [
          { key: 0, content: t('DRIVER_QUICK_COMMENT_5_0', "Good communication") },
          { key: 1, content: t('DRIVER_QUICK_COMMENT_5_1', "Followed instructions") },
          { key: 2, content: t('DRIVER_QUICK_COMMENT_5_2', "Friendly") },
          { key: 3, content: t('DRIVER_QUICK_COMMENT_5_3', 'Handled with care') },
          { key: 4, content: t('DRIVER_QUICK_COMMENT_5_4', "Above and beyond") },
        ]
      },
    },
    product: {
      like: [
        { key: 0, content: t('QUICK_COMMENT_LIKE_0', "Tasty") },
        { key: 1, content: t('QUICK_COMMENT_LIKE_1', "Good price") },
        { key: 2, content: t('QUICK_COMMENT_LIKE_2', "Good portion size") },
        { key: 3, content: t('QUICK_COMMENT_LIKE_3', "Packed well") },
      ],
      dislike: [
        { key: 0, content: t('QUICK_COMMENT_DISLIKE_0', "Not tasty") },
        { key: 1, content: t('QUICK_COMMENT_DISLIKE_1', "High price") },
        { key: 2, content: t('QUICK_COMMENT_DISLIKE_2', "Bad portion size") },
        { key: 3, content: t('QUICK_COMMENT_DISLIKE_3', "Not packed well") },
      ]
    }
  }

  return reviews[type]
}

export const getCurrenySymbol = (code: keyof typeof CURRENCY) => {
  return CURRENCY[code]?.symbol ?? code
}

/**
 * Driver UI allows selecting delivery priority unless Ordering disables it via disable_delivery_priority.
 * Shows priority UI when config is missing, empty, or numeric 0; hides only when value is non-zero (e.g. "1").
 */
export const getShowDeliveryPrioritySelection = (configs: any): boolean => {
  const disableDpRaw = configs?.disable_delivery_priority?.value;
  const hideDeliveryPrioritySelection =
    disableDpRaw !== undefined &&
    disableDpRaw !== null &&
    disableDpRaw !== '' &&
    Number(disableDpRaw) !== 0 &&
    !Number.isNaN(Number(disableDpRaw));
  return !hideDeliveryPrioritySelection;
};
