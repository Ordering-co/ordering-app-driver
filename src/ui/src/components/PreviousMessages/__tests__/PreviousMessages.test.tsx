import React from 'react'
import { FlatList, Image, ScrollView, StyleSheet, View } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      parseDate: (v: string) => v || '2026-01-01',
      optimizeImage: (url: string) => url
    }])
  }
})

import { useApi } from '@components'
import { PreviousMessages } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'
import { freezeClock, restoreClock } from '../../../../../../jest/helpers/fakeClock'
import { orderStatusVariant, timeStatusVariant } from '../../shared/orderStates'
import { OAvatar, ODivider } from '../../shared'
import { defaultAppTheme } from '../../../../../theme/engine'
import { themeColor, themeImage, themeRadius } from '../../../../../theme/helpers'

const tabs = [{ key: 0, text: 'Orders', tags: [0, 1] }]
const flat = (node: any) => StyleSheet.flatten(node.props.style)
/** The nearest view above a node whose style says what is asked. */
const above = (node: any, has: (style: any) => boolean) => {
  let up = node.parent
  while (up && !has(flat(up))) up = up.parent
  return up
}
const theme: any = defaultAppTheme()
const badge = theme.native.components.badge.variants

const renderList = (order: any, props: any = {}) => renderWithProviders(
  <PreviousMessages
    orders={[order]}
    tabs={tabs}
    tabsFilter={[0, 1]}
    loading={false}
    reload={false}
    error={null}
    {...props}
  />
)

describe('PreviousMessages', () => {
  it('renders order message cards', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
        pagination={{ currentPage: 1, totalPages: 1 }}
        getOrders={jest.fn()}
        onNavigationRedirect={jest.fn()}
      />
    )
    expect(getByText('#101 · Store A')).toBeTruthy()
    expect(getByTestId('message-meta')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
  })

  it('navigates to OrderMessage on press', () => {
    const onNavigationRedirect = jest.fn()
    const setOrders = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
        setOrders={setOrders}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    fireEvent.press(getByText('#101 · Store A'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'OrderMessage',
      expect.objectContaining({ orderId: 101, setOrders })
    )
  })

  it('shows unread badge when unread_count > 0', () => {
    const { getByText } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, unread_count: 5, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
      />
    )
    expect(getByText('5')).toBeTruthy()
  })

  it('shows load more button when more pages remain', () => {
    const loadMore = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
        pagination={{ currentPage: 1, totalPages: 3 }}
        loadMore={loadMore}
      />
    )
    fireEvent.press(getByText('Load more orders'))
    expect(loadMore).toHaveBeenCalled()
  })

  it('is a flat row that grows with its content, pressable as a whole (components.list_row)', () => {
    const { getByTestId } = renderList(sampleOrder)
    const row = flat(getByTestId('message-row'))
    const look = theme.native.components.list_row.base
    expect(row.backgroundColor).toBe(look.background)
    // The tall row of the list (`list_row.base.tall_min_height`, 76 as the boards) with `xs` of its own over and under.
    expect(row.minHeight).toBe(look.tall_min_height)
    expect(look.tall_min_height).toBe(76)
    expect(row.paddingVertical).toBe(theme.native.tokens.space.xs)
    // Not a card: no box of its own, no fixed height.
    expect(row.borderRadius).toBeUndefined()
    expect(row.height).toBeUndefined()
    expect(row.maxHeight).toBeUndefined()
    expect(getByTestId('message-row').props.accessibilityRole).toBe('button')
  })

  it('carries the page gutter on its content, not its frame, and draws the app\'s line between its rows', () => {
    const { UNSAFE_getByType, UNSAFE_getAllByType } = renderList(sampleOrder, { orders: [sampleOrder, { ...sampleOrder, id: 102 }] })
    const list = UNSAFE_getByType(FlatList)
    expect(flat(list).paddingHorizontal).toBeUndefined()
    const content = StyleSheet.flatten(list.props.contentContainerStyle)
    expect(content.paddingHorizontal).toBe(theme.native.tokens.layout.page_gutter)
    // A line between two rows, none after the last.
    expect(UNSAFE_getAllByType(ODivider)).toHaveLength(1)
  })

  it('draws the skeleton of its rows on the same gutter while it loads', () => {
    const { UNSAFE_getByType, getAllByTestId } = renderWithProviders(
      <PreviousMessages orders={[]} tabs={tabs} tabsFilter={[0, 1]} loading reload={false} error={null} />
    )
    expect(getAllByTestId('message-row-skeleton')).toHaveLength(6)
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    expect(content.paddingHorizontal).toBe(theme.native.tokens.layout.page_gutter)
  })

  it('paints the store\'s logo, or the theme\'s placeholder without one', () => {
    const withLogo = renderList({ ...sampleOrder, business: { ...sampleOrder.business, logo: 'https://cdn.test/logo.png' } })
    expect(withLogo.UNSAFE_getByType(Image).props.source).toEqual({ uri: 'https://cdn.test/logo.png', cache: 'force-cache' })
    const without = renderList(sampleOrder)
    expect(without.UNSAFE_getByType(Image).props.source).toBe(themeImage(theme, 'placeholder.business_logo'))
  })

  it('frames the store\'s logo as every store\'s logo of the app: the avatar\'s own rounded square', () => {
    const avatar = renderList(sampleOrder).UNSAFE_getByType(OAvatar)
    expect(avatar.props.kind).toBe('business')
    expect(avatar.props).not.toHaveProperty('radius')
    expect(flat(avatar.findByType(View)).borderRadius).toBe(themeRadius(theme, 'sm'))
  })

  it('colors the status badge by the order\'s state (decision D4)', () => {
    const background = (status: number) => flat(renderList({ ...sampleOrder, status }).getByTestId('message-status')).backgroundColor
    expect(background(0)).toBe(badge.primary.background)
    expect(background(8)).toBe(badge.primary.background)
    expect(background(1)).toBe(badge.success.background)
    expect(background(11)).toBe(badge.success.background)
    expect(background(2)).toBe(badge.danger.background)
    expect(background(12)).toBe(badge.danger.background)
  })

  it('writes the timer small and semibold, the card\'s timer text (`order_card.base.time_text`)', () => {
    const timer = flat(renderList({ ...sampleOrder, time_status: 'in_time' }).getByTestId('message-timer'))
    const text = theme.native.components.order_card.base.time_text
    expect(timer.fontSize).toBe(text.fontSize)
    expect(timer.fontFamily).toBe(text.fontFamily)
  })

  it('writes the timer of an open order in its time state\'s text color, and shows none on a finished one', () => {
    const timer = (order: any) => renderList(order).queryByTestId('message-timer')
    expect(flat(timer({ ...sampleOrder, time_status: 'in_time' })).color).toBe(themeColor(theme, 'success_text'))
    expect(flat(timer({ ...sampleOrder, time_status: 'at_risk' })).color).toBe(themeColor(theme, 'warning_text'))
    expect(flat(timer({ ...sampleOrder, time_status: 'delayed' })).color).toBe(themeColor(theme, 'danger_text'))
    // Not measured yet: muted.
    expect(flat(timer({ ...sampleOrder, time_status: null })).color).toBe(themeColor(theme, 'text_muted'))
    expect(timer({ ...sampleOrder, status: 1, time_status: 'delayed' })).toBeNull()
  })

  it('puts the timer over the count of unread messages at the row\'s end', () => {
    const { getByTestId } = renderList({ ...sampleOrder, unread_count: 2, time_status: 'in_time' })
    const aside = above(getByTestId('message-timer'), (style) => style?.alignItems === 'flex-end')
    expect(aside).toBeTruthy()
    expect(aside.findAll((node: any) => node.props?.testID === 'message-unread').length).toBeGreaterThan(0)
    const slot = theme.native.components.chat_bubble.slots.unread
    expect(flat(getByTestId('message-unread')).backgroundColor).toBe(badge[slot.variant].background)
  })

  it('names the count of unread messages for a screen reader', () => {
    expect(renderList({ ...sampleOrder, unread_count: 2 }).getByLabelText('2 unread messages')).toBeTruthy()
    expect(renderList({ ...sampleOrder, unread_count: 1 }).getByLabelText('1 unread message')).toBeTruthy()
  })

  it('writes the title of a row with unread messages in bold, and keeps it as it is without', () => {
    const name = (unread: number) => flat(renderList({ ...sampleOrder, unread_count: unread, business: { ...sampleOrder.business, name: 'Luna Pizza' } }).getByText('#101 · Luna Pizza'))
    expect(name(2).fontFamily).not.toBe(name(0).fontFamily)
  })

  it('names a status with the app\'s one list of names (decision H1)', () => {
    const name = (status: number | string) => renderList({ ...sampleOrder, status }).getByTestId('message-status')
    expect(name(4)).toHaveTextContent('Ready for pickup')
    expect(name(5)).toHaveTextContent('Rejected by business')
    expect(name(2)).toHaveTextContent('Rejected')
    expect(name(18)).toHaveTextContent('Driver almost arrived to business')
    // The API may send the number as a string.
    expect(name('11')).toHaveTextContent('Delivery completed by driver')
  })

  it('shows no status badge for a status the app does not know', () => {
    expect(renderList({ ...sampleOrder, status: 99 }).queryByTestId('message-status')).toBeNull()
  })

  it('writes the same name on every row of a status, in every render', () => {
    const orders = [1, 2, 3].map(id => ({ ...sampleOrder, id, status: 4 }))
    const { getAllByTestId, rerender } = renderList(sampleOrder, { orders })
    const expectNames = () => {
      const badges = getAllByTestId('message-status')
      expect(badges).toHaveLength(3)
      badges.forEach(node => expect(node).toHaveTextContent('Ready for pickup'))
    }
    expectNames()
    rerender(
      <PreviousMessages orders={[...orders]} tabs={tabs} tabsFilter={[0, 1]} loading={false} reload={false} error={null} />
    )
    expectNames()
  })

  it('titles a row "#number · store", the number masked in a secure project (decision H2: the id is masked everywhere)', () => {
    const order = { ...sampleOrder, id: 123456 }
    expect(renderList(order).getByTestId('message-title')).toHaveTextContent('#123456 · Store A')

    ;(useApi as jest.Mock).mockReturnValue([{ project: 'luisv4plus' }, {}])
    try {
      const secure = renderList(order)
      expect(secure.getByTestId('message-title')).toHaveTextContent('#12**** · Store A')
      expect(secure.queryByText(/123456/)).toBeNull()
    } finally {
      (useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
    }
  })

  it('writes the title as the order card\'s header does: the same helpers, the number with its "#" and the one separator', () => {
    const { joinTitle, orderNumberTag } = require('../../../utils')
    const title = renderList({ ...sampleOrder, id: 3506 }).getByTestId('message-title')
    expect(title.props.children).toBe(joinTitle([orderNumberTag(3506), 'Store A']))
    expect(title.props.children).toBe('#3506 · Store A')
  })

  it('has the title alone, with no separator, when the store has no name', () => {
    const { getByTestId } = renderList({ ...sampleOrder, business: { ...sampleOrder.business, name: undefined } })
    expect(getByTestId('message-title').props.children).toBe('#101')
  })

  it('keeps the title on one line that is cut at its end, so a long name never takes the number', () => {
    const longName = 'The Extraordinarily Long-Named Store of Many Words & Branches Downtown'
    const screen = renderList({ ...sampleOrder, id: 3506, business: { ...sampleOrder.business, name: longName } })
    const title = screen.getByTestId('message-title')
    expect(title.props.numberOfLines).toBe(1)
    expect(title.props.ellipsizeMode).toBe('tail')
    // The number is the first thing of the line, so what an ellipsis takes is the end of the name.
    expect(title.props.children).toBe(`#3506 · ${longName}`)
    expect(title.props.children.startsWith('#3506 · ')).toBe(true)
    // The date is a line of its own, no longer sharing the title's line.
    expect(screen.getByTestId('message-meta').props.children).not.toMatch(/#3506|Order No/)
  })

  it('keeps the date on one line, and the status badge wraps', () => {
    const screen = renderList({ ...sampleOrder, id: 3506 })
    // The meta line is one line with an ellipsis: the row keeps the mockup's 76 (a wrapped date made it 93).
    const meta = screen.getByTestId('message-meta')
    expect(meta.props.numberOfLines).toBe(1)
    expect(meta.props.ellipsizeMode).toBe('tail')
    // The badges row wraps: a status never truncates under a larger text size.
    expect(above(screen.getByTestId('message-status'), (style) => style?.flexWrap === 'wrap')).toBeTruthy()
  })

  it('names the row for a screen reader by what it shows: the title, the date, the status, the timer and the unread count', () => {
    const screen = renderList({ ...sampleOrder, id: 3506, unread_count: 2 })
    const label: string = screen.getByTestId('message-row').props.accessibilityLabel
    expect(label.startsWith('#3506 · Store A, ')).toBe(true)
    expect(label).toContain(screen.getByTestId('message-meta').props.children)
    expect(label).toContain('Pending')
    expect(label).toContain('2 unread messages')
    // No unread messages: nothing about them is said.
    expect(renderList({ ...sampleOrder, unread_count: 0 }).getByTestId('message-row').props.accessibilityLabel).not.toMatch(/unread/)
  })

  describe('the timer', () => {
    // 10:00 of the device's day: the delivery times below are read on the same clock.
    const now = new Date(2026, 0, 1, 10, 0, 0).getTime()
    const timer = (delivery: string, eta?: number) => renderList({
      ...sampleOrder,
      delivery_datetime_utc: delivery,
      eta_time: eta
    }).getByTestId('message-timer')

    beforeEach(() => {
      freezeClock(now)
    })

    afterEach(() => {
      restoreClock()
      jest.restoreAllMocks()
    })

    it('is written as every order timer of the app (decision H4)', () => {
      expect(timer('2026-01-01 12:05:00')).toHaveTextContent('02:05')
      expect(timer('2026-01-01 10:07:00')).toHaveTextContent('00:07')
      expect(timer('2026-01-02 12:05:00')).toHaveTextContent('1 day 02:05')
      expect(timer('2026-01-01 09:53:00')).toHaveTextContent('- 00:07')
      expect(timer('2025-12-31 07:55:00')).toHaveTextContent('- 1 day 02:05')
    })

    it('counts the order\'s preparation time', () => {
      expect(timer('2026-01-01 10:00:00', 125)).toHaveTextContent('02:05')
    })

    it('reads a delivery time without a UTC one as the 5 hours later of the CDT it is in', () => {
      const cdt = (delivery: string, eta?: number) => renderList({
        ...sampleOrder,
        delivery_datetime_utc: undefined,
        delivery_datetime: delivery,
        eta_time: eta
      }).getByTestId('message-timer')
      // 07:00 CDT is 12:00 UTC: two hours after the clock, and its preparation time added.
      expect(cdt('2026-01-01 07:00:00')).toHaveTextContent('02:00')
      expect(cdt('2026-01-01 07:00:00', 30)).toHaveTextContent('02:30')
      expect(cdt('2026-01-01 04:53:00')).toHaveTextContent('- 00:07')
    })
  })

  it('shows no unread badge for an order without unread messages', () => {
    const { queryByTestId } = renderList({ ...sampleOrder, unread_count: 0 })
    expect(queryByTestId('message-unread')).toBeNull()
  })

  it('shows no rows while the list reloads or after an error', () => {
    expect(renderList(sampleOrder, { reload: true }).queryByTestId('message-row')).toBeNull()
    expect(renderList(sampleOrder, { error: ['Network Error'] }).queryByTestId('message-row')).toBeNull()
  })
})

describe('order badges', () => {
  it('maps every status to a state', () => {
    expect([1, 11, 15].map(orderStatusVariant)).toEqual(['success', 'success', 'success'])
    expect([2, 5, 6, 10, 12, 16, 17].every(status => orderStatusVariant(status) === 'danger')).toBe(true)
    expect([0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26].every(status => orderStatusVariant(status) === 'primary')).toBe(true)
    expect(orderStatusVariant('11')).toBe('success')
    expect(orderStatusVariant(undefined)).toBe('primary')
  })

  it('maps the time states', () => {
    expect(['in_time', 'at_risk', 'delayed', '', undefined].map(timeStatusVariant as any)).toEqual(['success', 'warning', 'danger', 'neutral', 'neutral'])
  })
})
