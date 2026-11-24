import { Platform } from 'react-native'

import { calculateDistance, formatPhone, phoneUrl, transformDistance } from '../../utils'
import { themeVisible } from '@/theme/helpers'

/**
 * What an order's details say of its two parties, the store and the customer,
 * and the rules for it: which contact links are shown (and under which
 * visibility key), how a number is written and dialled (`utils/phone`: international, with the party's country code), the address
 * that opens the maps app, the customer's name and the distance between them.
 * The order's details, its map and the assign request's screen read them, so a rule has one place.
 */

export interface ContactLink {
  key: string
  /** `mailto:` or `tel:` (E.164, with the country code when it is known; a number that cannot be dialled says `invalid`). */
  url: string
  /** What the link says. */
  text: string
}

/** The maps app's link for an address of an order's party (the store's or the customer's). */
export const mapsUrl = (address?: string, location?: { lat?: number, lng?: number } | null) =>
  Platform.select({
    ios: `maps:0,0?q=${address}@${location?.lat},${location?.lng}`,
    android: `geo:0,0?q=${address}@${location?.lat},${location?.lng}`
  })

export interface PartyContacts {
  email: ContactLink | null
  /** The cellphone, then the phone: each only when the party has it and the theme shows phones. */
  phones: ContactLink[]
}

const NO_CONTACTS: PartyContacts = { email: null, phones: [] }

/**
 * The store's contacts (`confirmation.business.email` / `.phone`). They are not
 * shown for an order that is still a request of the logistic assignment
 * (`logisticOrderStatus`): the driver has not accepted it yet.
 */
export const businessContacts = (theme: any, order: any, logisticOrderStatus?: number[], defaultCountry?: string): PartyContacts => {
  if (order?.isLogistic && logisticOrderStatus?.includes(order?.status)) return NO_CONTACTS
  const business = order?.business
  const phone = (key: 'cellphone' | 'phone'): ContactLink | null => {
    const number = business?.[key]
    if (!number || !themeVisible(theme, 'confirmation.business.phone')) return null
    return { key, url: phoneUrl(number, business?.country_phone_code, defaultCountry), text: formatPhone(number, business?.country_phone_code, defaultCountry) }
  }
  return {
    email: business?.email && themeVisible(theme, 'confirmation.business.email')
      ? { key: 'email', url: `mailto:${business.email}`, text: business.email }
      : null,
    phones: [phone('cellphone'), phone('phone')].filter((link): link is ContactLink => !!link)
  }
}

/** The customer's contacts (`confirmation.customer.email` / `.phone`). */
export const customerContacts = (theme: any, order: any, defaultCountry?: string): PartyContacts => {
  const customer = order?.customer
  const phone = (key: 'cellphone' | 'phone'): ContactLink | null => {
    const number = customer?.[key]
    if (!number || !themeVisible(theme, 'confirmation.customer.phone')) return null
    return { key, url: phoneUrl(number, customer?.country_phone_code, defaultCountry), text: formatPhone(number, customer?.country_phone_code, defaultCountry) }
  }
  return {
    email: customer?.email && themeVisible(theme, 'confirmation.customer.email')
      ? { key: 'email', url: `mailto:${customer.email}`, text: customer.email }
      : null,
    phones: [phone('cellphone'), phone('phone')].filter((link): link is ContactLink => !!link)
  }
}

/**
 * What the card of the current stop does with a party's contacts: its first phone is the Call button's, and
 * the other phones and the e-mail are links the details keep under "More details", so no contact is lost.
 */
export const stopContacts = (
  theme: any,
  order: any,
  party: 'business' | 'customer',
  logisticOrderStatus?: number[],
  defaultCountry?: string
): { call?: ContactLink, links: ContactLink[] } => {
  const contacts = party === 'business' ? businessContacts(theme, order, logisticOrderStatus, defaultCountry) : customerContacts(theme, order, defaultCountry)
  const [call, ...otherPhones] = contacts.phones
  return { call, links: [...otherPhones, ...(contacts.email ? [contacts.email] : [])] }
}

/**
 * The customer's name as the details have always written it: name, middle name, last name, second last name
 * (each after the first one with a space before it, so an order with no name starts with a space: trim it where it matters).
 */
export const customerFullName = (order: any): string => {
  const customer = order?.customer
  return `${customer?.name ? customer.name : ''}`
    + `${customer?.middle_name ? ' ' + customer.middle_name : ''}`
    + `${customer?.lastname ? ' ' + customer.lastname : ''}`
    + `${customer?.second_lastname ? ' ' + customer.second_lastname : ''}`
}

/** The delivery option of a delivery order (leave at the door…), translated; null for any other order. */
export const deliveryOptionName = (order: any, t: (key: string, fallback?: string) => string): string | null =>
  order?.delivery_option && [1, 7].includes(order?.delivery_type)
    ? t(order.delivery_option?.name?.toUpperCase?.()?.replace(/ /g, '_'), order.delivery_option?.name)
    : null

/** A distance in kilometers as the project writes it: its unit's number and name ("3.40 km", "2.11 mi"). */
export const distanceText = (kilometers: number, distanceUnit: string | undefined, t: (key: string, fallback?: string) => string) =>
  `${transformDistance(kilometers, distanceUnit)} ${t(distanceUnit?.toUpperCase?.() as string, distanceUnit as string) ?? ''}`

/** The distance between the store and the customer, in kilometers; null when either has no location. */
export const storeToCustomerKilometers = (order: any): number | null =>
  order?.business?.location && order?.customer?.location
    ? calculateDistance(order.business.location, { latitude: order.customer.location.lat, longitude: order.customer.location.lng })
    : null
