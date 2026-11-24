import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Alert, StyleSheet } from 'react-native'
import { act, fireEvent, within } from '@testing-library/react-native'

import { useApi, useConfig, useUtils } from '@components'
import { offlineActionsFns, offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersIntegrationUiMock(), ['useOfflineActions', 'ReviewCustomer', 'useLocation'])
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

jest.mock('../../../../../context/PermissionsContext', () =>
  require('../../../../../../jest/helpers/mockPermissionsContext')
)

import dayjs from '@/utils/dayjs'
import { PreviousOrders as PreviousOrdersList } from '..'
import { useAcceptSheet } from '../../../hooks/useAcceptSheet'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverOrderTitle, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'
import { freezeClock, restoreClock } from '../../../../../../jest/helpers/fakeClock'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { cardActionsFor } from '../cardActions'
import { itemsCount, paymentChip } from '../orderCardData'
import { formatCardDuration } from '../orderCardTime'

const { useLocation } = require('@ui')
const { holdPress, tapPress } = require('../../../../../../jest/helpers/holdPress')
const { PermissionsContext, mockPermissions } = require('../../../../../../jest/helpers/mockPermissionsContext')

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)
/** The nearest view above a node whose style sets `key` (a box of the card's layout, not the composite pieces between). */
const boxWith = (node: any, key: string) => {
  let up = node.parent
  while (up && !(typeof up.type === 'string' && StyleSheet.flatten(up.props.style)?.[key] !== undefined)) up = up.parent
  return up && StyleSheet.flatten(up.props.style)
}
/** What the location hook gives: a position (none by default, as the hook starts at 0, 0) and the calls the accept view makes of it. */
const driverAt = (latitude: number, longitude: number) => ({
  userLocation: { latitude, longitude, timestamp: Date.now() },
  getCurrentLocation: jest.fn().mockResolvedValue({ latitude, longitude, mocked: false }),
  followUserLocation: jest.fn(),
  stopFollowUserLocation: jest.fn()
})

/** The list as the orders screen draws it: the screen hosts the accept sheet (`useAcceptSheet`), and the list asks for it. */
const PreviousOrders = (props: any) => {
  const { openSheet, sheet } = useAcceptSheet({
    actions: props.actions,
    orderTitle: props.orderTitle,
    appTitle: props.appTitle,
    isLoadingOrder: props.loadingChangeOrder
  })
  // The screen reads the driver's position (`useListDriverPosition`) and gives it to the list.
  const { userLocation } = useLocation()
  return (
    <PermissionsContext.Provider value={props.permissions ?? mockPermissions}>
      <PreviousOrdersList openAcceptSheet={openSheet} driverPosition={userLocation} {...props} />
      {sheet}
    </PermissionsContext.Provider>
  )
}

const baseProps = {
  orderTitle: {
    ...driverOrderTitle,
    deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
  },
  actions: { accept: 'acceptByDriver', reject: 'rejectByDriver' },
  getOrderStatus: () => 'Pending',
  appTitle: { text: 'Delivery app' },
  handleChangeOrderStatus: jest.fn(),
  onNavigationRedirect: jest.fn(),
  handleClickOrder: jest.fn()
}

const NBSP = /\u00A0/g
const ALL_CONFIGS = {
  allow_driver_reject_order: { value: '1' },
  failed_pickup_by_driver_enabled: { value: '1' }
}
const configs = (extra: Record<string, any> = {}) =>
  (useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { ...ALL_CONFIGS, ...extra } }])
const enterprise = (extra: Record<string, any> = {}) => configs({ plan_enterprise: { value: '1' }, ...extra })

/** The order a driver gets: a delivery with its store and customer, how it is paid, what it holds and when it is due. */
const order = {
  ...sampleOrder,
  id: 101,
  status: 0,
  delivery_type: 1,
  delivery_datetime_utc: '2099-01-01 12:48:00',
  delivery_datetime: '2099-01-01 12:48:00',
  eta_time: 5,
  time_status: 'in_time',
  total: 24.5,
  summary: { total: 24.5 },
  business: {
    name: 'Luna Pizza',
    logo: null,
    address: '214 Harbor St',
    location: { lat: 40.7228, lng: -74.006 }
  },
  customer: { name: 'Ana', lastname: 'Gil', address: '9 Birch Rd', location: { lat: 40.8, lng: -74.006 } },
  paymethod: { gateway: 'cash', name: 'Cash' },
  payment_events: [{ event: 'payment', paymethod: { gateway: 'cash' }, amount: 24.5 }],
  products: [{ id: 1, name: 'Pizza', quantity: 2 }, { id: 2, name: 'Cola', quantity: 1 }]
}

const renderCard = (extra: any = {}, props: any = {}, themeOverrides?: any) => renderWithProviders(
  <PreviousOrders {...baseProps} currentTabSelected='pending' orders={[{ ...order, ...extra }]} {...props} />,
  themeOverrides ? { themeOverrides } : undefined
)

const toasts = () => require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast.mock.calls
const holdHint = () => toasts().some((call: any[]) => call[1] === 'Hold to confirm')
const noConnectionHints = () => toasts().filter((call: any[]) => call[1] === 'No connection. Try again when the network is back.')

/** The clock the card reads, local time: the order is due at 12:53 (12:48 and 5 minutes of preparation). */
const at = (clock: string) => freezeClock(new Date(clock).getTime())

/** The project's formats, as the SDK writes a date with its format. */
const projectFormats = () => (useUtils as jest.Mock).mockReturnValue([{
  optimizeImage: (url: string) => url,
  parsePrice: (value: number) => `$${value}`,
  parseNumber: (value: number) => value,
  parseDate: (value: string, { outputFormat }: any = {}) => outputFormat ? dayjs(value).format(outputFormat) : value,
  timeFormat: 'hh:mm:ss A',
  dateFormat: 'MM/DD/YYYY'
}, {}])

describe('OrderItem: the order card', () => {
  const theme: any = defaultAppTheme()
  const colors = theme.native.tokens.color
  const badge = theme.native.components.badge
  const button = theme.native.components.button
  const card = theme.native.components.order_card

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    offlineActionsFns.applyOffAction.mockReset().mockResolvedValue(true)
    offlineActionsFns.registerOffOrder.mockReset().mockResolvedValue(undefined)
    ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
    // No fix of the driver's position by default (the location hook starts at 0, 0).
    ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
    configs()
    projectFormats()
  })
  afterEach(() => restoreClock())

  describe('the header', () => {
    it('writes the store\'s name, small and muted, over "#number · customer", the strong line, on one line each', () => {
      const { getByTestId } = renderCard()
      const store = getByTestId('order-card-store-name')
      expect(store.props.children).toBe('Luna Pizza')
      expect(store.props.numberOfLines).toBe(1)
      expect(flat(store).fontSize).toBe(card.base.meta.fontSize)
      expect(flat(store).color).toBe(card.base.meta_color)
      const title = getByTestId('order-card-title')
      expect(title.props.children).toBe('#101 · Ana Gil')
      expect(title.props.numberOfLines).toBe(1)
      // 16 over 1.4, semibold: the card's own title text.
      expect(flat(title).fontSize).toBe(card.base.title_text.fontSize)
      expect(flat(title).fontSize).toBe(theme.native.tokens.typography.body_lg.fontSize)
      expect(flat(title).fontFamily).toBe(card.base.title_text.fontFamily)
      expect(flat(title).fontFamily).toBe(theme.native.tokens.typography.label.fontFamily)
    })

    it('masks the number of a secure project and writes the external id when the project shows it', () => {
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
      const secure = renderCard({ id: 1234567 })
      expect(secure.getByTestId('order-card-title').props.children).toBe('#123**** · Ana Gil')
      secure.unmount()
      ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
      configs({ change_order_id: { value: '1' } })
      const external = renderCard({ external_id: 'EXT-101' })
      expect(external.getByTestId('order-card-title').props.children).toBe('#EXT-101 · Ana Gil')
    })

    it('puts the sync cloud and the unread dot after the title', () => {
      const { getByTestId } = renderCard({ showNotification: true })
      expect(getByTestId('order-card-unread')).toBeTruthy()
    })

    it('says which group a lone order of a group is, over the store\'s name', () => {
      const { getByTestId } = renderCard({ order_group_id: 57 })
      expect(getByTestId('order-card-store-name').props.children).toBe('Group No. 57 · Luna Pizza')
    })
  })

  describe('the status band: the time at its end (the existing computation and thresholds)', () => {
    beforeEach(() => enterprise())
    const band = (screen: any) => flat(screen.getByTestId('order-card-band'))
    const timeOf = (screen: any) => screen.getByTestId('order-card-time')

    it('writes what an order has left as one text, "24 min left", in the brand\'s soft tone when it is on time', () => {
      at('2099-01-01T12:29:00')
      const screen = renderCard()
      expect(timeOf(screen).props.children).toBe('24 min left')
      // The band's tint and its texts' color are the soft variant's; the text is the card's time text (12 over 1.5, semibold).
      expect(band(screen).backgroundColor).toBe(badge.variants.primary_soft.background)
      expect(flat(timeOf(screen)).color).toBe(badge.variants.primary_soft.color)
      expect(flat(timeOf(screen)).fontSize).toBe(card.base.time_text.fontSize)
      expect(flat(timeOf(screen)).fontFamily).toBe(card.base.time_text.fontFamily)
    })

    it('is "12 min late" (no "+"), in the danger tone, once the order is past its time', () => {
      at('2099-01-01T13:05:00')
      const screen = renderCard()
      expect(timeOf(screen).props.children).toBe('12 min late')
      expect(band(screen).backgroundColor).toBe(badge.variants.danger_soft.background)
      expect(flat(timeOf(screen)).color).toBe(badge.variants.danger_soft.color)
    })

    describe('is short, so the status keeps its room (a very late order is "2 d late", not "42 h 47 min late")', () => {
      const t = (_key: string, fallback?: string) => fallback ?? _key

      it.each([
        [0, '0 min'],
        [59, '59 min'],
        [60, '1 h 00 min'],
        [125, '2 h 05 min'],
        [599, '9 h 59 min'],
        [600, '10 h'],
        [1439, '23 h'],
        [2567, '42 h'],
        [2879, '47 h'],
        [2880, '2 d'],
        [4320, '3 d'],
        [100000, '69 d']
      ])('writes %i minutes as "%s"', (minutes, figure) => {
        expect(formatCardDuration(minutes, t)).toBe(figure)
      })

      it('writes nothing for what is not a number, and uses the catalog\'s pieces (min, h, d) of the language', () => {
        expect(formatCardDuration(NaN, t)).toBe('')
        const pieces: Record<string, string> = { TIME_MIN: 'dk.', TIME_HOUR: 'sa', TIME_DAY: 'g' }
        const tr = (key: string, fallback?: string) => pieces[key] ?? fallback ?? key
        expect([125, 700, 3000].map((minutes) => formatCardDuration(minutes, tr))).toEqual(['2 sa 05 dk.', '11 sa', '2 g'])
        // The catalog has the day's piece, in every language.
        const catalog = require('../../../../../../i18n/translations.json')
        expect(catalog.TIME_DAY.en).toBe('d')
        expect(Object.keys(catalog.TIME_DAY)).toEqual(Object.keys(catalog.TIME_HOUR))
      })

      it.each([
        ['2099-01-03T07:40:00', '42 h late'],
        ['2099-01-01T22:52:00', '9 h 59 min late'],
        ['2099-01-01T22:53:00', '10 h late'],
        ['2099-01-03T12:52:00', '47 h late'],
        ['2099-01-03T12:53:00', '2 d late'],
        ['2099-01-06T16:00:00', '5 d late']
      ])('is late by the clock %s: "%s"', (clock, text) => {
        at(clock)
        expect(timeOf(renderCard()).props.children).toBe(text)
      })

      it('is the same short figure for what an order has left', () => {
        // Due at 12:53 on the 1st: 4 days and 3 h 53 min from the 28th at 09:00.
        at('2098-12-28T09:00:00')
        expect(timeOf(renderCard()).props.children).toBe('4 d left')
      })
    })

    it('is one text that is never cut and does not shrink: it keeps its width, or goes under the status, at the end of the band', () => {
      at('2099-01-01T22:52:00')
      const screen = renderCard()
      const time = flat(timeOf(screen))
      expect(time).toEqual(expect.objectContaining({ flexShrink: 0, maxWidth: '100%', marginLeft: 'auto', textAlign: 'right' }))
      expect(time.flexGrow).toBeUndefined()
      expect(timeOf(screen).props.numberOfLines).toBeUndefined()
      // The band wraps its row: the status takes the room, at least 40% of the band, so the two never squeeze each other.
      expect(band(screen)).toEqual(expect.objectContaining({ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }))
      expect(flat(screen.getByTestId('order-card-status'))).toEqual(expect.objectContaining({ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: '40%' }))
    })

    it('is late in danger whatever the API\'s time state says: the text and the tone agree', () => {
      at('2099-01-01T13:05:00')
      const screen = renderCard({ time_status: 'in_time' })
      expect(band(screen).backgroundColor).toBe(badge.variants.danger_soft.background)
    })

    it.each([
      ['in_time', 'primary_soft'],
      ['at_risk', 'warning_soft'],
      ['delayed', 'danger_soft']
    ])('tints the band of time state %s with %s, and never tints the card', (timeStatus, variant) => {
      at('2099-01-01T12:29:00')
      const screen = renderCard({ time_status: timeStatus })
      expect(band(screen).backgroundColor).toBe(badge.variants[variant].background)
      expect(flat(screen.getByTestId('order-card-status')).color).toBe(badge.variants[variant].color)
      expect(flat(screen.getByTestId('order-card-101')).backgroundColor).toBe(card.base.background)
    })

    it('rounds the band\'s top corners to the card\'s inside and takes it edge to edge (the card\'s padding cancelled)', () => {
      const screen = renderCard()
      const padding = theme.native.components.card.base.padding
      expect(band(screen)).toEqual(expect.objectContaining({
        marginTop: -padding,
        marginHorizontal: -padding,
        marginBottom: padding,
        paddingHorizontal: padding,
        borderTopLeftRadius: card.base.radius - card.base.border.borderWidth,
        borderTopRightRadius: card.base.radius - card.base.border.borderWidth
      }))
      expect(band(screen).minHeight).toBe(theme.native.tokens.size.sm)
    })

    it('reads a delivery time with no UTC one as the 5 hours later of the CDT it is in', () => {
      at('2099-01-01T10:00:00')
      // 07:00 CDT is 12:00 UTC; with its 5 minutes of preparation, 12:05: 2 h 5 min from 10:00.
      const screen = renderCard({ delivery_datetime_utc: undefined, delivery_datetime: '2099-01-01 07:00:00', eta_time: 5 })
      expect(timeOf(screen).props.children).toBe('2 h 05 min left')
    })

    it('adds the clock time with orders.absolute_time: "24 min left · due 12:53 PM", "12 min late · due 12:30 PM"', () => {
      at('2099-01-01T12:29:00')
      const on = themeWith({ visibility: { 'orders.absolute_time': true } })
      const left = renderCard({}, {}, on)
      expect(timeOf(left).props.children.replace(NBSP, ' ')).toBe('24 min left · due 12:53 PM')
      // The time of day never breaks a line: it moves to the next one whole.
      expect(timeOf(left).props.children).toContain('12:53 PM')
      left.unmount()
      at('2099-01-01T12:42:00')
      const late = renderCard({ delivery_datetime_utc: '2099-01-01 12:25:00', eta_time: 5 }, {}, on)
      expect(timeOf(late).props.children.replace(NBSP, ' ')).toBe('12 min late · due 12:30 PM')
      expect(band(late).backgroundColor).toBe(badge.variants.danger_soft.background)
    })

    it('writes the phrase alone when the clock time is off (the default)', () => {
      at('2099-01-01T12:29:00')
      expect(timeOf(renderCard()).props.children).toBe('24 min left')
    })

    it('keeps a long status wrapping and the long time whole: both are in the band, the time never cut', () => {
      at('2099-01-01T12:47:00')
      const long = 'Driver almost arrived to customer'
      const screen = renderCard({ time_status: 'at_risk' }, { getOrderStatus: () => long }, themeWith({ visibility: { 'orders.absolute_time': true } }))
      expect(screen.getByTestId('order-card-status').props.children).toBe(long)
      expect(screen.getByTestId('order-card-status').props.numberOfLines).toBeUndefined()
      expect(timeOf(screen).props.children.replace(NBSP, ' ')).toBe('6 min left · due 12:53 PM')
      expect(timeOf(screen).props.numberOfLines).toBeUndefined()
      expect(band(screen).backgroundColor).toBe(badge.variants.warning_soft.background)
    })

    it('draws the status alone, in the brand\'s soft tone, on the tabs of open orders without the enterprise plan (no time)', () => {
      configs()
      const screen = renderCard({ time_status: 'delayed' })
      expect(screen.queryByTestId('order-card-time')).toBeNull()
      expect(screen.getByTestId('order-card-status').props.children).toBe('Pending')
      expect(band(screen).backgroundColor).toBe(badge.variants.primary_soft.background)
    })

    it('draws no band and no time on an assign request', () => {
      const { queryByTestId } = renderWithProviders(
        <PreviousOrders {...baseProps} isLogisticOrder handleClickLogisticOrder={jest.fn()} currentTabSelected='pending' orders={[{ id: 55, isLogistic: true, order: { ...order, id: 101 } }]} />
      )
      expect(queryByTestId('order-card-time')).toBeNull()
      expect(queryByTestId('order-card-status')).toBeNull()
      expect(queryByTestId('order-card-band')).toBeNull()
    })
  })

  describe('the status band: the status at its start', () => {
    it('writes the status in the band\'s text (small, strong), as many lines as its words need, never cut', () => {
      const long = 'Driver almost arrived to customer'
      const { getByTestId } = renderCard({}, { getOrderStatus: () => long })
      const status = getByTestId('order-card-status')
      expect(status.props.children).toBe(long)
      expect(status.props.numberOfLines).toBeUndefined()
      expect(flat(status).fontSize).toBe(card.base.time_text.fontSize)
      expect(flat(status).fontFamily).toBe(card.base.time_text.fontFamily)
      // It is inside the band, the first thing of the card.
      expect(within(getByTestId('order-card-band')).getByText(long)).toBeTruthy()
    })

    it('writes the status by its name in the list (the app\'s one list of names)', () => {
      expect(renderCard({ status: 4 }, { getOrderStatus: (status: number) => `Status ${status}` }).getByTestId('order-card-status').props.children).toBe('Status 4')
    })

    it('hides the status with orders.order_status and keeps the time; with no time either the band is not drawn', () => {
      enterprise()
      at('2099-01-01T12:29:00')
      const noStatus = themeWith({ visibility: { 'orders.order_status': false } })
      const timeOnly = renderCard({}, {}, noStatus)
      expect(timeOnly.queryByTestId('order-card-status')).toBeNull()
      expect(timeOnly.getByTestId('order-card-time').props.children).toBe('24 min left')
      timeOnly.unmount()
      configs()
      const nothing = renderCard({}, {}, noStatus)
      expect(nothing.queryByTestId('order-card-band')).toBeNull()
      expect(nothing.getByTestId('order-card-title').props.children).toBe('#101 · Ana Gil')
    })
  })

  describe('an order that is over writes the clock time it ended or was due and its day, in the tone of how it ended', () => {
    const over = (extra: any = {}) => renderCard({ status: 11, ...extra }, { currentTabSelected: 'completed' })
    const band = (screen: any) => flat(screen.getByTestId('order-card-band'))

    beforeEach(() => at('2099-01-01T12:29:00'))

    it('is the moment the API reports for its last status, "11:42 AM · today", in the success tone when it was completed', () => {
      const screen = over({ reporting_data: { at: { 'status:11': '2099-01-01 11:42:00' } } })
      expect(screen.getByTestId('order-card-time').props.children).toBe('11:42 AM · today')
      expect(band(screen).backgroundColor).toBe(badge.variants.success_soft.background)
      expect(flat(screen.getByTestId('order-card-time')).color).toBe(badge.variants.success_soft.color)
    })

    it('is in the danger tone for an order cancelled, rejected or failed', () => {
      const cancelled = renderCard({ status: 2 }, { currentTabSelected: 'cancelled' })
      expect(band(cancelled).backgroundColor).toBe(badge.variants.danger_soft.background)
      cancelled.unmount()
      const failed = renderCard({ status: 12 }, { currentTabSelected: 'cancelled' })
      expect(band(failed).backgroundColor).toBe(badge.variants.danger_soft.background)
    })

    it('is "yesterday" a day before, and the project\'s date from there', () => {
      const yesterday = over({ reporting_data: { at: { 'status:11': '2098-12-31 22:10:00' } } })
      expect(yesterday.getByTestId('order-card-time').props.children).toBe('10:10 PM · yesterday')
      yesterday.unmount()
      const older = over({ reporting_data: { at: { 'status:11': '2098-12-20 09:05:00' } } })
      expect(older.getByTestId('order-card-time').props.children).toBe('09:05 AM · 12/20/2098')
    })

    it('is the time the order was due when the API does not say when it ended', () => {
      expect(over().getByTestId('order-card-time').props.children).toBe('12:48 PM · today')
    })

    it('is the same on the tab of cancelled orders, and draws no remaining time even on the enterprise plan', () => {
      enterprise()
      const { getByTestId, queryByText } = renderCard({ status: 2 }, { currentTabSelected: 'cancelled' })
      expect(getByTestId('order-card-time').props.children).toBe('12:48 PM · today')
      expect(queryByText(/left/)).toBeNull()
    })

    it('hides the time with orders.date (what it controls now) and keeps the status in its tone and the rest of the card', () => {
      const screen = renderCard({ status: 11 }, { currentTabSelected: 'completed' }, themeWith({ visibility: { 'orders.date': false } }))
      expect(screen.queryByTestId('order-card-time')).toBeNull()
      expect(screen.getByTestId('order-card-status')).toBeTruthy()
      expect(band(screen).backgroundColor).toBe(badge.variants.success_soft.background)
      expect(screen.getByTestId('order-card-title').props.children).toBe('#101 · Ana Gil')
    })

    it('has no quick actions and no stop', () => {
      const { queryByTestId } = over()
      expect(queryByTestId('order-card-101-actions')).toBeNull()
      expect(queryByTestId('order-card-stop')).toBeNull()
    })
  })

  describe('the next stop and the driver\'s distance to it', () => {
    const stopText = (screen: any) => screen.getByTestId('order-card-stop').props.children
    const distanceText = (screen: any) => screen.queryByTestId('order-card-distance')?.props.children

    it('is "Pick up at <store address>" before the pickup and "Deliver to <customer address>" once picked up', () => {
      expect(stopText(renderCard({ status: 0 }))).toBe('Pick up at 214 Harbor St')
      expect(stopText(renderCard({ status: 9 }))).toBe('Deliver to 9 Birch Rd')
    })

    it('adds " · <distance>" when the app knows the driver\'s position, in the project\'s unit, as a text of its own', () => {
      configs({ distance_unit: { value: 'km' } })
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006))
      const picking = renderCard({ status: 3 })
      expect(stopText(picking)).toBe('Pick up at 214 Harbor St')
      // 0.01 degrees of latitude: about 1.1 km.
      expect(distanceText(picking)).toMatch(/^· 1\.1\d? km$/)
      picking.unmount()
      const delivering = renderCard({ status: 9 })
      expect(stopText(delivering)).toBe('Deliver to 9 Birch Rd')
      // The customer's location, 9.7 km north of the driver.
      expect(distanceText(delivering)).toMatch(/^· \d+\.\d+ km$/)
    })

    it('has one space\'s worth before the "·": the row\'s gap, not a no-break space on top of it', () => {
      configs({ distance_unit: { value: 'km' } })
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006))
      const { getByTestId } = renderCard({ status: 3 })
      const distance = getByTestId('order-card-distance')
      expect(distance.props.children).not.toMatch(/^\s|\u00A0/)
      let row = distance.parent
      while (row && flat(row)?.gap === undefined) row = row.parent
      expect(flat(row).gap).toBe(theme.native.tokens.space.xs)
    })

    it('shrinks the address and never the distance: the address ends in the ellipsis, the whole distance is always there', () => {
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006))
      const { getByTestId } = renderCard({ status: 3, business: { ...order.business, address: 'A very long street name 1234567890, a long city, a long state, a long country' } })
      const address = getByTestId('order-card-stop')
      const distance = getByTestId('order-card-distance')
      expect(address.props.numberOfLines).toBe(1)
      expect(flat(address)).toEqual(expect.objectContaining({ flexShrink: 1, minWidth: 0 }))
      expect(flat(address).flex).toBeUndefined()
      // The distance takes the room it needs and gives none back.
      expect(flat(distance).flexShrink).toBe(0)
      expect(flat(distance).fontSize).toBe(flat(address).fontSize)
    })

    it('writes no distance without a position (the 0, 0 the location hook starts with is none), and never "from you"', () => {
      const { getByTestId, queryByTestId } = renderCard({ status: 3 })
      expect(getByTestId('order-card-stop').props.children).toBe('Pick up at 214 Harbor St')
      expect(queryByTestId('order-card-distance')).toBeNull()
    })

    it('writes no distance for a stop that has no location, and none for an order without an address at all', () => {
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006))
      const noLocation = renderCard({ status: 3, business: { ...order.business, location: undefined } })
      expect(noLocation.getByTestId('order-card-stop').props.children).toBe('Pick up at 214 Harbor St')
      expect(noLocation.queryByTestId('order-card-distance')).toBeNull()
      noLocation.unmount()
      const noAddress = renderCard({ status: 3, business: { name: 'Luna Pizza', logo: null } })
      expect(noAddress.queryByTestId('order-card-stop')).toBeNull()
    })

    it('has no line on an assign request, and none once the order is over', () => {
      const request = renderWithProviders(
        <PreviousOrders {...baseProps} isLogisticOrder handleClickLogisticOrder={jest.fn()} orders={[{ id: 55, isLogistic: true, order: { ...order, id: 101 } }]} />
      )
      expect(request.queryByTestId('order-card-stop')).toBeNull()
      request.unmount()
      expect(renderCard({ status: 11 }).queryByTestId('order-card-stop')).toBeNull()
    })

    it('reads the line in the card\'s small text, on one line', () => {
      const { getByTestId } = renderCard({ status: 3 })
      expect(flat(getByTestId('order-card-stop')).fontSize).toBe(theme.native.tokens.typography.body_sm.fontSize)
      expect(getByTestId('order-card-stop').props.numberOfLines).toBe(1)
    })
  })

  describe('the total in the header', () => {
    it('writes the total as the details format it, large, at the header\'s end, beside the title (never in the band)', () => {
      const { getByTestId } = renderCard({ status: 0 })
      const total = getByTestId('order-card-total')
      expect(total.props.children).toBe('$24.5')
      expect(flat(total).fontSize).toBe(theme.native.tokens.typography.h4.fontSize)
      // It is a piece of the header's row, after the title's column, and it keeps its room.
      const header = boxWith(total, 'flexDirection')
      expect(header).toEqual(expect.objectContaining({ flexDirection: 'row', alignItems: 'center' }))
      expect(flat(total).flexShrink).toBe(0)
      expect(within(getByTestId('order-card-band')).queryByTestId('order-card-total')).toBeNull()
      expect(flat(getByTestId('order-card-title')).flexShrink).toBe(1)
    })

    it('paints the status in the band by the state of the time, not by the status (the chip is gone)', () => {
      const { getByTestId } = renderCard({ status: 0 })
      expect(flat(getByTestId('order-card-band')).backgroundColor).toBe(badge.variants.primary_soft.background)
    })

    it('hides the total with the details\' own switch (confirmation.order.total) and keeps the band', () => {
      const { queryByTestId, getByTestId } = renderCard({}, {}, themeWith({ visibility: { 'confirmation.order.total': false } }))
      expect(queryByTestId('order-card-total')).toBeNull()
      expect(getByTestId('order-card-status')).toBeTruthy()
    })

    it('keeps the total with orders.order_status off', () => {
      const { getByTestId } = renderCard({}, {}, themeWith({ visibility: { 'orders.order_status': false } }))
      expect(getByTestId('order-card-total').props.children).toBe('$24.5')
    })

    it('writes no total for an order whose payload has none', () => {
      const { queryByTestId } = renderCard({ total: undefined, summary: undefined })
      expect(queryByTestId('order-card-total')).toBeNull()
    })

    it('writes the summary\'s total over the order\'s own, as the details do', () => {
      const { getByTestId } = renderCard({ total: 20, summary: { total: 24.5 } })
      expect(getByTestId('order-card-total').props.children).toBe('$24.5')
    })

    it('writes the total of an order that is over too, beside a title that shrinks', () => {
      const { getByTestId } = renderCard({ status: 11 }, { currentTabSelected: 'completed' })
      expect(getByTestId('order-card-total').props.children).toBe('$24.5')
    })
  })

  describe('the chips', () => {
    it('writes the order type\'s chip, then how it is paid and how many items it has', () => {
      const { getByTestId } = renderCard()
      expect(getByTestId('order-card-type')).toBeTruthy()
      expect(within(getByTestId('order-card-type')).getByText('Delivery')).toBeTruthy()
      expect(getByTestId('order-card-items').props.children).toBe('3 items')
    })

    it('counts the products\' quantities, as the details do, and says "1 item" for one', () => {
      expect(itemsCount({ products: [{ quantity: 2 }, { quantity: 1 }, {}] })).toBe(3)
      expect(itemsCount({ products: [] })).toBeUndefined()
      expect(itemsCount({})).toBeUndefined()
      const one = renderCard({ products: [{ id: 1, name: 'Pizza', quantity: 1 }] })
      expect(one.getByTestId('order-card-items').props.children).toBe('1 item')
      one.unmount()
      expect(renderCard({ products: undefined }).queryByTestId('order-card-items')).toBeNull()
    })

    it('writes "Delivery #N" in a pill, in place of the type, when the order has a position', () => {
      const { getByTestId, getByText, queryByTestId } = renderCard({ delivery_position: 2 }, { activeOrdersCount: 3 })
      expect(getByText('Delivery #2')).toBeTruthy()
      expect(queryByTestId('order-card-type')).toBeNull()
      expect(flat(getByTestId('order-card-position')).borderRadius).toBe(badge.base.radius)
    })

    it('opens the delivery position dialog from the pill, with the stepper, never past the active orders', () => {
      const { getByTestId, getByLabelText, getByText } = renderCard({ delivery_position: 2 }, { activeOrdersCount: 3 })
      fireEvent.press(getByTestId('order-card-position'))
      expect(getByText('Order No. 101')).toBeTruthy()
      fireEvent.press(getByLabelText('Increase'))
      expect(getByText('3')).toBeTruthy()
      expect(getByLabelText('Increase').props.accessibilityState.disabled).toBe(true)
    })

    it('offers the setter beside the type while the order has no position yet', () => {
      const { getByTestId } = renderCard({ delivery_position: null }, { activeOrdersCount: 3 })
      expect(getByTestId('order-card-position')).toBeTruthy()
      expect(getByTestId('order-card-type')).toBeTruthy()
    })

    it('draws no position where the project does not order by it, and keeps the type', () => {
      configs({ disable_delivery_priority: { value: '1' } })
      const { queryByTestId, queryByText } = renderCard({ delivery_position: 2 })
      expect(queryByTestId('order-card-position')).toBeNull()
      expect(queryByText('Delivery #2')).toBeNull()
      expect(queryByTestId('order-card-type')).toBeTruthy()
    })

    describe('the order type\'s colour: the chip and "Delivery #N" take the badge variant of how the order leaves the store', () => {
      const chipOf = (screen: any) => screen.getByTestId('order-card-type')

      it('has the business app\'s three variants: a medium tint with dark text of the same hue', () => {
        expect(badge.variants.type_delivery).toEqual(expect.objectContaining({ background: '#D9CCFA', color: '#3F1E96' }))
        expect(badge.variants.type_pickup).toEqual(expect.objectContaining({ background: '#B9E4E8', color: '#0A4E55' }))
        expect(badge.variants.type_in_store).toEqual(expect.objectContaining({ background: '#FAD4B4', color: '#7A3505' }))
      })

      it.each([
        [1, 'type_delivery', 'Delivery'],
        [7, 'type_delivery', 'Catering delivery'],
        [2, 'type_pickup', 'Pickup'],
        [4, 'type_pickup', 'Curbside'],
        [5, 'type_pickup', 'Driver thru'],
        [8, 'type_pickup', 'Catering pickup'],
        [3, 'type_in_store', 'Eat in'],
        [9, 'type_in_store', 'Reservation']
      ])('paints delivery_type %i with %s (%s)', (type, variant, label) => {
        const screen = renderCard({ delivery_type: type })
        expect(flat(chipOf(screen)).backgroundColor).toBe(badge.variants[variant].background)
        expect(flat(within(chipOf(screen)).getByText(label)).color).toBe(badge.variants[variant].color)
      })

      it('paints a type the app does not know with the neutral badge, and the label stays the one the app has', () => {
        const screen = renderCard({ delivery_type: 99 })
        expect(flat(chipOf(screen)).backgroundColor).toBe(badge.variants.neutral.background)
        expect(within(chipOf(screen)).getByText('Delivery')).toBeTruthy()
      })

      it('paints "Delivery #N" with the type\'s colour too, and presses like a button', () => {
        const pickup = renderCard({ delivery_type: 2, delivery_position: 2 }, { activeOrdersCount: 3 })
        const pill = pickup.getByTestId('order-card-position')
        expect(flat(pill).backgroundColor).toBe(badge.variants.type_pickup.background)
        expect(flat(within(pill).getByText('Delivery #2')).color).toBe(badge.variants.type_pickup.color)
        expect(pill.props.accessibilityRole).toBe('button')
        pickup.unmount()
        const delivery = renderCard({ delivery_type: 1, delivery_position: 2 }, { activeOrdersCount: 3 })
        expect(flat(delivery.getByTestId('order-card-position')).backgroundColor).toBe(badge.variants.type_delivery.background)
      })

      it('reaches a control tall for the touch, though the chip is small', () => {
        const { getByTestId } = renderCard({ delivery_position: 2 }, { activeOrdersCount: 3 })
        const { hitSlop } = getByTestId('order-card-position').props
        expect(badge.sizes.sm.height + hitSlop.top + hitSlop.bottom).toBe(theme.native.tokens.size.md)
      })

      it('is locked, dimmed, while the order is on the way to the customer (status 23): the dialog does not open', () => {
        const { getByTestId, queryByTestId } = renderCard({ status: 23, delivery_position: 2 }, { activeOrdersCount: 3 })
        const pill = getByTestId('order-card-position')
        expect(pill.props.accessibilityState.disabled).toBe(true)
        expect(flat(pill).opacity).toBe(theme.native.tokens.opacity.disabled)
        fireEvent.press(pill)
        expect(queryByTestId('order-position-dialog')).toBeNull()
      })
    })

    describe('Collect cash or Paid, by the details\' one rule (the payment is only cash)', () => {
      const chip = (extra: any) => paymentChip({ ...order, ...extra }, extra.isCashOnly)

      it('is "Collect in cash" in the warning tint for an order paid only in cash', () => {
        const { getByTestId } = renderCard()
        const payment = getByTestId('order-card-payment')
        expect(within(payment).getByText('Collect in cash')).toBeTruthy()
        expect(flat(payment).backgroundColor).toBe(badge.variants.warning_soft.background)
      })

      it('is "Paid" in the success tint for any order that is not only cash', () => {
        const { getByTestId } = renderCard({
          paymethod: { gateway: 'stripe', name: 'Card' },
          payment_events: [{ event: 'payment', paymethod: { gateway: 'stripe' }, amount: 24.5 }]
        })
        const payment = getByTestId('order-card-payment')
        expect(within(payment).getByText('Paid')).toBeTruthy()
        expect(flat(payment).backgroundColor).toBe(badge.variants.success_soft.background)
      })

      it('is a cash order with no payment event too (the method says it), and an order with no method writes nothing', () => {
        const noEvents = renderCard({ payment_events: [] })
        expect(within(noEvents.getByTestId('order-card-payment')).getByText('Collect in cash')).toBeTruthy()
        noEvents.unmount()
        const nothing = renderCard({ paymethod: undefined, payment_events: undefined })
        expect(nothing.queryByTestId('order-card-payment')).toBeNull()
      })

      it('writes neither for card on delivery: it is not paid, and the details do not say to collect it', () => {
        expect(chip({ paymethod: { gateway: 'card_delivery' }, payment_events: [], isCashOnly: false })).toBeNull()
        expect(chip({ paymethod: { gateway: 'stripe' }, payment_events: [{ event: 'payment', paymethod: { gateway: 'card_delivery' } }], isCashOnly: false })).toBeNull()
      })

      it('keeps an order paid with a wallet and the rest in cash as the details do: not only cash, so Paid', () => {
        const mixed = renderCard({
          payment_events: [
            { event: 'payment', paymethod: { gateway: 'cash' }, data: { wallet_currency: 'credit_point' } },
            { event: 'payment', paymethod: { gateway: 'cash' } }
          ]
        })
        expect(within(mixed.getByTestId('order-card-payment')).getByText('Paid')).toBeTruthy()
      })
    })

    it('wraps onto another line when it must and keeps the chips apart by the card\'s small gap', () => {
      const { getByTestId } = renderCard()
      expect(flat(getByTestId('order-card-chips'))).toEqual(expect.objectContaining({
        flexDirection: 'row',
        flexWrap: 'wrap',
        columnGap: theme.native.tokens.space.xs,
        rowGap: theme.native.tokens.space.xs
      }))
    })
  })

  describe('every existing orders.* visibility key still works on the card', () => {
    it.each([
      ['orders.business_logo', 'order-card-logo'],
      ['orders.business_name', 'order-card-store-name'],
      ['orders.order_type', 'order-card-type'],
      ['orders.order_status', 'order-card-status']
    ])('hides a piece of the card with %s and keeps the rest', (key, testID) => {
      const shown = renderCard()
      expect(shown.getByTestId(testID)).toBeTruthy()
      shown.unmount()
      const hidden = renderCard({}, {}, themeWith({ visibility: { [key]: false } }))
      expect(hidden.queryByTestId(testID)).toBeNull()
      expect(hidden.getByTestId('order-card-title').props.children).toBe('#101 · Ana Gil')
    })

    it('hides the "#number" with orders.order_number and keeps the customer', () => {
      const { getByTestId } = renderCard({}, {}, themeWith({ visibility: { 'orders.order_number': false } }))
      expect(getByTestId('order-card-title').props.children).toBe('Ana Gil')
    })

    it('hides the position pill and the type chip together with orders.order_type', () => {
      const { queryByTestId, queryByText } = renderCard({ delivery_position: 2 }, { activeOrdersCount: 3 }, themeWith({ visibility: { 'orders.order_type': false } }))
      expect(queryByTestId('order-card-type')).toBeNull()
      expect(queryByTestId('order-card-position')).toBeNull()
      expect(queryByText('Delivery #2')).toBeNull()
    })

    it('draws the store\'s logo as the rounded square of every store logo', () => {
      const { getByTestId } = renderCard()
      const { themeRadius } = require('../../../../../theme/helpers')
      expect(flat(getByTestId('order-card-logo')).borderRadius).toBe(themeRadius(theme, 'sm'))
    })

    it('keeps the time of an open order with orders.date off (it only controls the clock time of an order that is over)', () => {
      enterprise()
      at('2099-01-01T12:29:00')
      const { getByTestId } = renderCard({}, {}, themeWith({ visibility: { 'orders.date': false } }))
      expect(getByTestId('order-card-time').props.children).toBe('24 min left')
    })

    it('draws a card with nothing it can hide: the total is all that is left under a bare header, and no band', () => {
      const everything = themeWith({ visibility: {
        'orders.business_logo': false,
        'orders.business_name': false,
        'orders.order_number': false,
        'orders.order_type': false,
        'orders.order_status': false,
        'orders.date': false
      } })
      const { queryByTestId, getByTestId } = renderCard({ customer: { name: '' } }, {}, everything)
      expect(queryByTestId('order-card-title')).toBeNull()
      expect(queryByTestId('order-card-store-name')).toBeNull()
      expect(queryByTestId('order-card-band')).toBeNull()
      expect(getByTestId('order-card-total')).toBeTruthy()
    })
  })

  describe('the two settings of the card', () => {
    it('keeps the buttons by default (orders.quick_actions on) and draws none with it off: the card only opens the order', () => {
      const on = renderCard()
      expect(on.getByText('Accept')).toBeTruthy()
      on.unmount()
      const handleClickOrder = jest.fn()
      const onNavigationRedirect = jest.fn()
      const off = renderCard({}, { handleClickOrder, onNavigationRedirect }, themeWith({ visibility: { 'orders.quick_actions': false } }))
      expect(off.queryByText('Accept')).toBeNull()
      expect(off.queryByText('Reject')).toBeNull()
      expect(off.queryByTestId('order-card-101-actions')).toBeNull()
      fireEvent.press(off.getByTestId('order-card-title'))
      expect(handleClickOrder).toHaveBeenCalled()
      expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 101 }) }))
    })

    it('hides the buttons of an assign request with orders.quick_actions off too, and its card still opens the request', () => {
      const onNavigationRedirect = jest.fn()
      const request = renderWithProviders(
        <PreviousOrders
          {...baseProps}
          isLogisticOrder
          onNavigationRedirect={onNavigationRedirect}
          handleClickLogisticOrder={jest.fn()}
          orders={[{ id: 55, isLogistic: true, order: { ...order, id: 101 } }]}
        />,
        { themeOverrides: themeWith({ visibility: { 'orders.quick_actions': false } }) }
      )
      expect(request.queryByText('Accept')).toBeNull()
      fireEvent.press(request.getByText('Luna Pizza'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetailsLogistic', expect.anything())
    })

    it('has them as the theme\'s defaults: quick actions on, clock time off', () => {
      const visibility = (defaultAppTheme() as any).values.visibility
      expect(visibility['orders.quick_actions']).toBe(true)
      expect(visibility['orders.absolute_time']).toBe(false)
    })
  })

  describe('the quick actions of each stage', () => {
    const labels = (screen: any) => ['Reject', 'Accept', 'Arrived to business', 'Pickup failed', 'Pickup complete', 'Arrived to customer', 'Delivery failed', 'Delivery complete']
      .filter((label) => screen.queryByText(label))
    const box = (screen: any, label: string) => flat(screen.getByText(label).parent.parent)

    it.each([
      ['offered', { status: 0 }, ['Reject', 'Accept']],
      ['accepted, on the way to the store', { status: 8 }, ['Arrived to business']],
      ['at the store', { status: 3 }, ['Pickup failed', 'Pickup complete']],
      ['on the way to the customer', { status: 23 }, ['Arrived to customer']],
      ['at the customer', { status: 26 }, ['Delivery failed', 'Delivery complete']],
      ['over', { status: 11 }, []]
    ])('%s: %j', (_stage, extra, expected) => {
      expect(labels(renderCard(extra))).toEqual(expected)
    })

    it('follows the driver\'s own stage of a ready order, as the details do', () => {
      const screen = renderCard({
        status: 4,
        last_driver_assigned_at: '2099-01-01 09:00:00',
        reporting_data: { at: { 'status:3': '2099-01-01 10:00:00' } }
      })
      expect(labels(screen)).toEqual(['Pickup failed', 'Pickup complete'])
    })

    it('puts the negative action outlined in the danger color across a third and the positive solid in success across two thirds', () => {
      const screen = renderCard({ status: 0 })
      expect(box(screen, 'Reject').backgroundColor).toBe(button.variants.danger.outline.background)
      expect(box(screen, 'Reject').borderColor).toBe(button.variants.danger.outline.border.borderColor)
      expect(box(screen, 'Accept').backgroundColor).toBe(button.variants.success.solid.background)
      expect(card.slots.advance).toEqual(expect.objectContaining({ color: 'success', appearance: 'solid', size: 'md' }))
      expect(card.slots.decline).toEqual(expect.objectContaining({ color: 'danger', appearance: 'outline', size: 'md' }))
      // 44 high: a touch target.
      expect(box(screen, 'Accept').minHeight).toBe(button.sizes.md.height)
      expect(button.sizes.md.height).toBeGreaterThanOrEqual(44)
      expect(boxWith(screen.getByText('Reject'), 'flexGrow').flexGrow).toBe(1)
      expect(boxWith(screen.getByText('Accept'), 'flexGrow').flexGrow).toBe(2)
    })

    it('puts a lone positive action across the whole row', () => {
      const screen = renderCard({ status: 8 })
      expect(boxWith(screen.getByText('Arrived to business'), 'flexGrow').flexGrow).toBe(1)
      expect(screen.queryByText('Pickup failed')).toBeNull()
    })

    it('keeps "Order not ready" and everything else of the bar in the order\'s details', () => {
      configs({ order_not_ready_enabled: { value: '1' } })
      const screen = renderCard({ status: 3 })
      expect(screen.queryByText('Order not ready')).toBeNull()
    })

    it('follows the project\'s configs as the bar does: no reject, no failed pickup, no failed delivery', () => {
      configs({ reject_orders_enabled: { value: '0' } })
      expect(labels(renderCard({ status: 0 }))).toEqual(['Accept'])
      expect(labels(renderCard({ status: 3 }))).toEqual(['Pickup complete'])
      expect(labels(renderCard({ status: 26 }))).toEqual(['Delivery complete'])
      configs({ failed_pickup_by_driver_enabled: { value: '0' } })
      expect(labels(renderCard({ status: 3 }))).toEqual(['Pickup complete'])
    })

    it('has the stage\'s rules in one pure function the bar\'s conditions are read from', () => {
      const base = { configs: ALL_CONFIGS, isPickupPhase: false }
      expect(cardActionsFor({ ...base, order: { delivery_type: 2 }, effectiveStatus: 8 })).toEqual({ decline: 'pickupFailed', advance: 'pickupComplete' })
      expect(cardActionsFor({ ...base, order: { delivery_type: 2 }, effectiveStatus: 9 })).toEqual({ decline: 'deliveryFailed', advance: 'deliveryComplete' })
      expect(cardActionsFor({ ...base, order: { delivery_type: 1, status: 9 }, effectiveStatus: 9 })).toEqual({ advance: 'arrivedToCustomer' })
      expect(cardActionsFor({ ...base, order: { delivery_type: 1, status: 26 }, effectiveStatus: 26, project: 'delosi' }))
        .toEqual({ decline: 'deliveryFailed', advance: 'deliveryComplete' })
      expect(cardActionsFor({ ...base, order: { delivery_type: 1, status: 19 }, effectiveStatus: 26, project: 'delosi' }))
        .toEqual({ decline: 'deliveryFailed', advance: undefined })
      expect(cardActionsFor({ ...base, order: { delivery_type: 1 }, effectiveStatus: 11 })).toEqual({})
    })

    it('is drawn for an order of the list only: a row inside a group and an assign request have the group\'s and the request\'s own', () => {
      const request = renderWithProviders(
        <PreviousOrders {...baseProps} isLogisticOrder handleClickLogisticOrder={jest.fn()} orders={[{ id: 55, isLogistic: true, order: { ...order, id: 101 } }]} />
      )
      expect(request.queryByTestId('order-card-101-actions')).toBeNull()
      // The request has its own buttons, in the same slots.
      expect(request.getByText('Accept')).toBeTruthy()
      expect(flat(request.getByText('Accept').parent.parent).backgroundColor).toBe(button.variants.success.solid.background)
      expect(flat(request.getByText('Reject').parent.parent).backgroundColor).toBe(button.variants.danger.outline.background)
    })
  })

  describe('what each action does: the same path as the order\'s bottom bar', () => {
    it('accept is one tap, never held, and opens the accept sheet over the list (time and position)', () => {
      const handleChangeOrderStatus = jest.fn()
      const screen = renderCard({ status: 0 }, { handleChangeOrderStatus })
      tapPress(screen.getByText('Accept'))
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(holdHint()).toBe(false)
    })

    it('accept sets the status at once when the project hides the time (hidden_driver_eta_time): one request for the order', async () => {
      configs({ hidden_driver_eta_time: { value: '1' } })
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }])
      const screen = renderCard({ status: 0 }, { handleChangeOrderStatus })
      await act(async () => { tapPress(screen.getByText('Accept')) })
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(8, [101])
      expect(screen.queryByTestId('order-sheet')).toBeNull()
    })

    it('reject opens its reason form, a page: a tap, with no hold (only an assign request\'s reject is held)', () => {
      const onNavigationRedirect = jest.fn()
      const handleChangeOrderStatus = jest.fn()
      const screen = renderCard({ status: 0 }, { onNavigationRedirect, handleChangeOrderStatus })
      tapPress(screen.getByText('Reject'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({
        action: 'reject',
        ids: [101],
        order: expect.objectContaining({ id: 101 })
      }))
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    it('reject tells the driver he may not when the project does not let him, and opens nothing', () => {
      configs({ allow_driver_reject_order: { value: '0' } })
      const onNavigationRedirect = jest.fn()
      const screen = renderCard({ status: 0 }, { onNavigationRedirect })
      tapPress(screen.getByText('Reject'))
      expect(onNavigationRedirect).not.toHaveBeenCalled()
      expect((Alert.alert as jest.Mock).mock.calls.at(-1)[1]).toBe('The driver is not allowed to reject an order.')
    })

    it.each([
      ['Pickup failed', 3, 'pickupFailed'],
      ['Delivery failed', 26, 'deliveryFailed']
    ])('%s opens its reason form, a page', (label, status, action) => {
      const onNavigationRedirect = jest.fn()
      const screen = renderCard({ status }, { onNavigationRedirect })
      tapPress(screen.getByText(label))
      expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({ action, ids: [101] }))
    })

    it.each([
      ['Arrived to business', 8, 3],
      ['Pickup complete', 3, 9],
      ['Arrived to customer', 23, 26],
      ['Delivery complete', 26, 11]
    ])('%s is a held step: a tap only says "Hold to confirm", the hold sets status %s once through the list\'s request', async (label, status, next) => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }])
      const screen = renderCard({ status }, { handleChangeOrderStatus })
      tapPress(screen.getByText(label))
      expect(holdHint()).toBe(true)
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      await holdPress(screen.getByText(label))
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(next, [101])
    })

    it('opens the order from a tap on the card outside its buttons', () => {
      const onNavigationRedirect = jest.fn()
      const screen = renderCard({ status: 0 }, { onNavigationRedirect })
      fireEvent.press(screen.getByTestId('order-card-store-name'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 101 }) }))
    })

    it('a tap on a button does not open the order', () => {
      const onNavigationRedirect = jest.fn()
      const screen = renderCard({ status: 0 }, { onNavigationRedirect })
      tapPress(screen.getByText('Accept'))
      expect(onNavigationRedirect).not.toHaveBeenCalledWith('OrderDetails', expect.anything())
    })

    describe('a step that needs a photo, a code or the location check opens the sheet of the details, and is not held', () => {
      it.each([
        ['a status photo', 'Pickup complete', 3, { states_requiring_image_driver: { value: '9' } }],
        ['a location check', 'Arrived to business', 8, { location_validation_enabled_status_3: { value: '1' } }],
        ['a location check', 'Pickup complete', 3, { location_validation_enabled_status_9: { value: '1' } }],
        ['a delivery code', 'Delivery complete', 26, { delivery_pin_enabled: { value: '1' } }]
      ])('%s: %s', async (_why, label, status, extra) => {
        configs(extra)
        const handleChangeOrderStatus = jest.fn()
        const screen = renderCard({ status, delivery_pin_status: 'requested' }, { handleChangeOrderStatus })
        tapPress(screen.getByText(label))
        expect(screen.getByTestId('order-sheet')).toBeTruthy()
        expect(holdHint()).toBe(false)
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      })

      it('a location check on the arrival to the customer, whose check only the details make, opens the order', () => {
        configs({ location_validation_enabled_status_26: { value: '1' } })
        const onNavigationRedirect = jest.fn()
        const handleChangeOrderStatus = jest.fn()
        const screen = renderCard({ status: 23 }, { onNavigationRedirect, handleChangeOrderStatus })
        tapPress(screen.getByText('Arrived to customer'))
        expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 101 }) }))
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect(holdHint()).toBe(false)
      })
    })

    describe('without the location permission', () => {
      const denied = { ...mockPermissions, isGrantedPermissions: false }

      it.each([['Accept', 0], ['Reject', 0], ['Arrived to business', 8], ['Pickup complete', 3], ['Pickup failed', 3], ['Delivery complete', 26]])(
        '%s takes the driver to the permissions page, as the bar does, and does not hold',
        async (label, status) => {
          const onNavigationRedirect = jest.fn()
          const handleChangeOrderStatus = jest.fn()
          const screen = renderCard({ status }, { onNavigationRedirect, handleChangeOrderStatus, permissions: denied })
          tapPress(screen.getByText(label))
          expect(onNavigationRedirect).toHaveBeenCalledWith('RequestPermissions')
          expect(holdHint()).toBe(false)
          expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        }
      )
    })

    describe('one change at a time', () => {
      it('a second hold while the first request has not answered sends nothing more, and the buttons are off meanwhile', async () => {
        let answer: (value: any) => void = () => {}
        const handleChangeOrderStatus = jest.fn(() => new Promise((resolve) => { answer = resolve }))
        const screen = renderCard({ status: 8 }, { handleChangeOrderStatus })
        await holdPress(screen.getByText('Arrived to business'))
        await holdPress(screen.getByText('Arrived to business'))
        expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
        expect(screen.getByTestId('order-card-101-arrivedToBusiness').props.accessibilityState.disabled).toBe(true)
        await act(async () => { answer([{ id: 101 }]) })
        expect(screen.getByTestId('order-card-101-arrivedToBusiness').props.accessibilityState.disabled).toBe(false)
      })

      it('frees the button when the request throws', async () => {
        const handleChangeOrderStatus = jest.fn().mockRejectedValue(new Error('down'))
        const screen = renderCard({ status: 8 }, { handleChangeOrderStatus })
        await holdPress(screen.getByText('Arrived to business'))
        expect(screen.getByTestId('order-card-101-arrivedToBusiness').props.accessibilityState.disabled).toBe(false)
      })

      it('is busy with its own change only: the controller\'s flag (a change of any order) paints no card off', () => {
        const screen = renderCard({ status: 0 }, { loadingChangeOrder: true })
        expect(screen.getByTestId('order-card-101-accept').props.accessibilityState.disabled).toBe(false)
        expect(screen.getByTestId('order-card-101-reject').props.accessibilityState.disabled).toBe(false)
        tapPress(screen.getByText('Accept'))
        expect(screen.getByTestId('order-sheet')).toBeTruthy()
      })

      describe('two orders on the list', () => {
        const other = { ...order, id: 102, status: 8, customer: { ...order.customer, name: 'Bea', lastname: 'Ruiz' } }
        const listOf = (extra: any = {}) => [{ ...order, status: 8, ...extra }, other]

        it('only the card of the order that is changing is busy; the other keeps its buttons as they are', async () => {
          let answer: (value: any) => void = () => {}
          const handleChangeOrderStatus = jest.fn(() => new Promise((resolve) => { answer = resolve }))
          const screen = renderCard({}, { orders: listOf(), handleChangeOrderStatus })
          await holdPress(screen.getByTestId('order-card-101-arrivedToBusiness'))
          expect(screen.getByTestId('order-card-101-arrivedToBusiness').props.accessibilityState.disabled).toBe(true)
          expect(screen.getByTestId('order-card-102-arrivedToBusiness').props.accessibilityState.disabled).toBe(false)
          await act(async () => { answer([{ id: 101 }]) })
          expect(screen.getByTestId('order-card-101-arrivedToBusiness').props.accessibilityState.disabled).toBe(false)
        })

        it('a tap on the other order meanwhile is its own request, at once; the busy order is never sent twice', async () => {
          const handleChangeOrderStatus = jest.fn((_status: number, ids: number[]) => ids[0] === 101 ? new Promise(() => {}) : Promise.resolve([{ id: ids[0] }]))
          const screen = renderCard({}, { orders: listOf(), handleChangeOrderStatus })
          await holdPress(screen.getByTestId('order-card-101-arrivedToBusiness'))
          await holdPress(screen.getByTestId('order-card-102-arrivedToBusiness'))
          await holdPress(screen.getByTestId('order-card-101-arrivedToBusiness'))
          expect(handleChangeOrderStatus.mock.calls).toEqual([[3, [101]], [3, [102]]])
        })

        it('pressing a button that is busy opens nothing: no card above it takes the press', async () => {
          const onNavigationRedirect = jest.fn()
          const handleChangeOrderStatus = jest.fn(() => new Promise(() => {}))
          const screen = renderCard({}, { orders: listOf(), handleChangeOrderStatus, onNavigationRedirect })
          await holdPress(screen.getByTestId('order-card-101-arrivedToBusiness'))
          fireEvent.press(screen.getByTestId('order-card-101-arrivedToBusiness'))
          expect(onNavigationRedirect).not.toHaveBeenCalled()
        })
      })
    })

    describe('a touch on a button is the button\'s alone: the card\'s press never fires from it (a second finger, the release, a drag)', () => {
      /** The views above a node that ask to be the responder of a touch (a pressable): the ones a second touch can hand the touch to. */
      const responderAncestors = (node: any) => {
        const found: any[] = []
        for (let up = node.parent; up; up = up.parent) {
          if (typeof up.type === 'string' && typeof up.props.onStartShouldSetResponder === 'function') found.push(up)
        }
        return found
      }

      it.each([
        ['Accept', 0],
        ['Reject', 0],
        ['Arrived to business', 8],
        ['Pickup failed', 3],
        ['Pickup complete', 3],
        ['Delivery failed', 26],
        ['Delivery complete', 26]
      ])('%s has no pressable above it: nothing can take its touch from it', (label, status) => {
        const screen = renderCard({ status })
        expect(responderAncestors(screen.getByText(label))).toHaveLength(1)
        // Only the button\'s own pressable asks for the touch; the card\'s is a sibling of the buttons, not their parent.
        const own = responderAncestors(screen.getByText(label))[0]
        expect(own.props.testID).toMatch(/^order-card-101-/)
        expect(own.parent && responderAncestors(own.parent)).toHaveLength(0)
      })

      it('puts the card\'s own pressable on the body (the header, the stop, the status, the chips) and the buttons beside it', () => {
        const screen = renderCard({ status: 3 })
        const press = screen.getByTestId('order-card-101-press')
        // The body is inside it, the buttons are not, and both are in the card\'s box.
        expect(within(press).getByTestId('order-card-title')).toBeTruthy()
        expect(within(press).queryByTestId('order-card-101-actions')).toBeNull()
        expect(within(screen.getByTestId('order-card-101')).getByTestId('order-card-101-actions')).toBeTruthy()
        expect(responderAncestors(screen.getByTestId('order-card-title'))).toHaveLength(1)
        expect(responderAncestors(screen.getByTestId('order-card-title'))[0].props.testID).toBe('order-card-101-press')
      })

      it('a held step\'s whole touch (down, the hold, up) opens nothing and fires once, and the same with the press that follows', async () => {
        const onNavigationRedirect = jest.fn()
        const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }])
        const screen = renderCard({ status: 8 }, { handleChangeOrderStatus, onNavigationRedirect })
        await holdPress(screen.getByText('Arrived to business'))
        expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
        expect(onNavigationRedirect).not.toHaveBeenCalled()
      })

      it('a press that starts on the card\'s body opens the order, and one on a button of the card never does', () => {
        const onNavigationRedirect = jest.fn()
        const screen = renderCard({ status: 3 }, { onNavigationRedirect })
        tapPress(screen.getByText('Pickup complete'))
        expect(onNavigationRedirect).not.toHaveBeenCalledWith('OrderDetails', expect.anything())
        fireEvent.press(screen.getByTestId('order-card-title'))
        expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 101 }) }))
      })

      it('keeps the whole card an opening: the box\'s padding is the pressable\'s touch margin, but at the bottom, where the buttons are', () => {
        const screen = renderCard({ status: 3 })
        const padding = card.base.padding ?? theme.native.components.card.base.padding
        expect(padding).toBeGreaterThan(0)
        expect(screen.getByTestId('order-card-101-press').props.hitSlop).toEqual({ top: padding, left: padding, right: padding })
      })

      it('gives the space above the buttons to the card\'s pressable and none to the row, so a tap between the chips and the buttons opens the order', () => {
        const screen = renderCard({ status: 3 })
        expect(flat(screen.getByTestId('order-card-101-press')).paddingBottom).toBe(theme.native.tokens.space.sm)
        expect(flat(screen.getByTestId('order-card-101-actions')).marginTop).toBeUndefined()
      })

      it('is the same for an assign request\'s Reject and Accept', () => {
        const request = renderWithProviders(
          <PreviousOrders {...baseProps} isLogisticOrder handleClickLogisticOrder={jest.fn()} orders={[{ id: 55, isLogistic: true, order: { ...order, id: 101 } }]} />
        )
        expect(responderAncestors(request.getByText('Reject'))).toHaveLength(1)
        expect(responderAncestors(request.getByText('Accept'))).toHaveLength(1)
      })
    })

    describe('after a held step', () => {
      it('the very next tap on a button of the card reaches it: the step leaves nothing waiting for another touch', async () => {
        const onNavigationRedirect = jest.fn()
        const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }])
        const props = { handleChangeOrderStatus, onNavigationRedirect }
        const screen = renderCard({ status: 8 }, props)
        await holdPress(screen.getByText('Arrived to business'))
        // The list loads again and the order is at the store: Pickup failed and Pickup complete.
        screen.rerender(<PreviousOrders {...baseProps} {...props} currentTabSelected='pending' orders={[{ ...order, status: 3 }]} />)
        expect(screen.getByTestId('order-card-101-pickupFailed').props.accessibilityState.disabled).toBe(false)
        tapPress(screen.getByText('Pickup failed'))
        expect(onNavigationRedirect).toHaveBeenCalledTimes(1)
        expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({ action: 'pickupFailed', ids: [101] }))
      })

      it('the same from Pickup complete to Delivery failed, and the held button that stays holds again at once', async () => {
        const onNavigationRedirect = jest.fn()
        const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }])
        const props = { handleChangeOrderStatus, onNavigationRedirect }
        const screen = renderCard({ status: 3 }, props)
        await holdPress(screen.getByText('Pickup complete'))
        screen.rerender(<PreviousOrders {...baseProps} {...props} currentTabSelected='pending' orders={[{ ...order, status: 26 }]} />)
        tapPress(screen.getByText('Delivery failed'))
        expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({ action: 'deliveryFailed' }))
        await holdPress(screen.getByText('Delivery complete'))
        expect(handleChangeOrderStatus).toHaveBeenLastCalledWith(11, [101])
      })
    })

    describe('without a connection', () => {
      it('with the offline queue on, a step is queued as one change of the order and sent nowhere', async () => {
        offlineActionsState.isNetConnected = false
        offlineActionsState.canSaveChangesOffline = true
        const handleChangeOrderStatus = jest.fn()
        const screen = renderCard({ status: 8 }, { handleChangeOrderStatus })
        await holdPress(screen.getByText('Arrived to business'))
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
        expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
          { event: 'evt_off_change_order_status', data: { orderId: 101, body: { status: 3, id: 101 } } }
        ])
        expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 101, status: 3, oldStatus: 8, unsync: true }))
        expect(toasts()).toEqual([])
      })

      it('a queue that could not be written says so and registers nothing', async () => {
        offlineActionsState.isNetConnected = false
        offlineActionsState.canSaveChangesOffline = true
        offlineActionsFns.applyOffAction.mockResolvedValue(false)
        const screen = renderCard({ status: 8 })
        await holdPress(screen.getByText('Arrived to business'))
        expect(toasts()).toEqual([['error', 'The change was not saved. Try again.']])
        expect(offlineActionsFns.registerOffOrder).not.toHaveBeenCalled()
        expect(screen.getByTestId('order-card-101-arrivedToBusiness').props.accessibilityState.disabled).toBe(false)
      })

      it('with the queue off the buttons stay painted off and a tap says why, once, whatever the button', async () => {
        offlineActionsState.isNetConnected = false
        offlineActionsState.canSaveChangesOffline = false
        const handleChangeOrderStatus = jest.fn()
        const onNavigationRedirect = jest.fn()
        const screen = renderCard({ status: 3 }, { handleChangeOrderStatus, onNavigationRedirect })
        expect(screen.getByTestId('order-card-101-pickupComplete').props.accessibilityState.disabled).toBe(true)
        expect(screen.getByTestId('order-card-101-pickupFailed').props.accessibilityState.disabled).toBe(true)
        tapPress(screen.getByText('Pickup complete'))
        tapPress(screen.getByText('Pickup failed'))
        expect(noConnectionHints()).toHaveLength(1)
        expect(holdHint()).toBe(false)
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect(onNavigationRedirect).not.toHaveBeenCalled()
        expect(offlineActionsFns.applyOffAction).not.toHaveBeenCalled()
      })
    })
  })

  describe('a card in the list is the same card for every row', () => {
    it('is redrawn when the money or the stage it writes changes, and only then', () => {
      const { areListedOrdersEqual } = require('../areListedOrderRowPropsEqual')
      expect(areListedOrdersEqual(order, { ...order })).toBe(true)
      expect(areListedOrdersEqual(order, { ...order, products: order.products.map((product) => ({ ...product })) })).toBe(true)
      expect(areListedOrdersEqual(order, { ...order, summary: { total: 30 } })).toBe(false)
      expect(areListedOrdersEqual(order, { ...order, paymethod: { gateway: 'stripe' } })).toBe(false)
      expect(areListedOrdersEqual(order, { ...order, products: [{ id: 1, quantity: 5 }] })).toBe(false)
      expect(areListedOrdersEqual(order, { ...order, business: { ...order.business, location: { lat: 1, lng: 2 } } })).toBe(false)
      expect(areListedOrdersEqual(order, { ...order, reporting_data: { at: { 'status:3': '2099-01-01 10:00:00' } } })).toBe(false)
    })
  })
})
