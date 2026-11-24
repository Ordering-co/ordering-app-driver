import React from 'react'
import { StyleSheet } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { OrderListSkeleton } from '../OrderListSkeleton'
import { OrderListItemSkeleton } from '../OrderListItemSkeleton'
import { orderCardStyles } from '../../PreviousOrders/styles'
import { orderCardPieces } from '../../PreviousOrders/orderCardPieces'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
/** The heights of the bones a row draws (its animated blocks). */
const boneHeights = (row: any) => row
  .findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number')
  .map((node: any) => flat(node).height)

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

describe('OrderListSkeleton', () => {
  const theme: any = defaultAppTheme()
  const card = theme.native.components.order_card.base
  const loaded = orderCardStyles(theme)
  const typography = theme.native.tokens.typography
  // The lines of the loaded card's texts: what the bones stand for.
  const store = StyleSheet.flatten(loaded.storeName).lineHeight
  const title = typography.body_lg.lineHeight
  const figure = typography.h4.lineHeight
  // The band's texts: the card's time text.
  const bandLine = StyleSheet.flatten(loaded.bandText).lineHeight
  const stop = typography.body_sm.lineHeight
  const logo = theme.native.components.avatar.sizes.md.size
  const badge = theme.native.components.badge.sizes.sm.height
  const chip = theme.native.components.chip.sizes.sm
  // The buttons' row of the card: the height of its action's button (`order_card.slots.advance`), `sm` under the body (the card's own gap).
  const action = theme.native.components.order_card.slots.advance
  const buttons = theme.native.components.button.sizes[action.size].height
  const gap = theme.native.tokens.space.sm

  it('draws as many placeholder cards as asked, five by default, `md` apart as the list', () => {
    const five = renderWithProviders(<OrderListSkeleton />)
    expect(five.getAllByTestId('order-list-item-skeleton')).toHaveLength(5)
    expect(flat(five.getByTestId('order-list-skeleton')).gap).toBe(theme.native.tokens.space.md)
    five.unmount()
    const two = renderWithProviders(<OrderListSkeleton count={2} />)
    expect(two.getAllByTestId('order-list-item-skeleton')).toHaveLength(2)
  })

  it('gives a row the box and the sizes of the real order card', () => {
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton />)
    const row = getByTestId('order-list-item-skeleton')
    expect(flat(row).backgroundColor).toBe(card.background)
    expect(flat(row).borderRadius).toBe(card.radius)
    expect(flat(row).padding).toBe(theme.native.components.card.base.padding)
    // The status band's status, the logo, the store's name over the title and the total, the stop's line, the type and the payment
    // chips: each as tall as what it stands for.
    expect(boneHeights(row)).toEqual([bandLine, logo, store, title, figure, stop, badge, badge, buttons])
  })

  it('is laid out with the card\'s own styles, so its gaps are the card\'s', () => {
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton showTimer />)
    const row = getByTestId('order-list-item-skeleton')
    const gaps = row.findAll((node: any) => typeof node.type === 'string' && flat(node)?.gap !== undefined).map((node: any) => flat(node))
    // The card's blocks and the header (logo beside the texts).
    expect(gaps.map((style: any) => style.gap)).toEqual(expect.arrayContaining([
      StyleSheet.flatten(loaded.body).gap,
      StyleSheet.flatten(loaded.header).gap
    ]))
    // The chips' row, which wraps as the card's.
    const chips = row.findAll((node: any) => typeof node.type === 'string' && flat(node)?.flexWrap === 'wrap' && flat(node)?.marginTop === undefined)
    expect(chips).toHaveLength(1)
    expect(flat(chips[0])).toEqual(expect.objectContaining(StyleSheet.flatten(loaded.chips)))
  })

  it('adds the time at the band\'s end only where the card shows one', () => {
    const without = renderWithProviders(<OrderListItemSkeleton />)
    const withTime = renderWithProviders(<OrderListItemSkeleton showTimer />)
    expect(boneHeights(withTime.getByTestId('order-list-item-skeleton')))
      .toEqual([bandLine, bandLine, logo, store, title, figure, stop, badge, badge, buttons])
    expect(boneHeights(without.getByTestId('order-list-item-skeleton')))
      .toHaveLength(boneHeights(withTime.getByTestId('order-list-item-skeleton')).length - 1)
  })

  it('draws the band edge to edge at the card\'s top, as the card\'s own band is (the same box, on a neutral tint)', () => {
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton showTimer />)
    const row = getByTestId('order-list-item-skeleton')
    const bands = row.findAll((node: any) => typeof node.type === 'string' && flat(node)?.flexWrap === 'wrap' && flat(node)?.marginTop < 0)
    expect(bands).toHaveLength(1)
    expect(flat(bands[0])).toEqual(expect.objectContaining(StyleSheet.flatten(loaded.band)))
    expect(flat(bands[0]).backgroundColor).toBe(theme.native.components.badge.variants.neutral.background)
  })

  it('draws the band for the time alone when the status is hidden, and none when neither is drawn', () => {
    const noStatus = themeWith({ visibility: { 'orders.order_status': false } })
    const timeOnly = renderWithProviders(<OrderListItemSkeleton showTimer />, { themeOverrides: noStatus })
    expect(boneHeights(timeOnly.getByTestId('order-list-item-skeleton'))[0]).toBe(bandLine)
    expect(boneHeights(timeOnly.getByTestId('order-list-item-skeleton'))).toHaveLength(9)
    timeOnly.unmount()
    const neither = renderWithProviders(<OrderListItemSkeleton />, { themeOverrides: noStatus })
    expect(boneHeights(neither.getByTestId('order-list-item-skeleton'))).toEqual([logo, store, title, figure, stop, badge, badge, buttons])
  })

  it('draws the delivery position as a badge-tall pill in place of the type\'s, never as tall as the setter chip', () => {
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton showPosition />)
    const row = getByTestId('order-list-item-skeleton')
    // The same bones as without a position: a card that has one draws "Delivery #N", a badge, where the type's was.
    expect(boneHeights(row)).toEqual([bandLine, logo, store, title, figure, stop, badge, badge, buttons])
    expect(badge).toBeLessThan(chip.height)
    expect(boneHeights(row)).not.toContain(chip.height)
  })

  it('makes the position\'s pill a little wider than the type\'s badge, as "Delivery #N" is longer than the type\'s word', () => {
    const chipsOf = (props: any) => {
      const { getByTestId } = renderWithProviders(<OrderListItemSkeleton {...props} />)
      const chips = getByTestId('order-list-item-skeleton').findAll((node: any) => typeof node.type === 'string' && flat(node)?.flexWrap === 'wrap' && flat(node)?.marginTop === undefined)
      return chips[0].findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number').map((node: any) => flat(node).width)
    }
    const [typeWidth, paymentWidth] = chipsOf({})
    const [pillWidth, pillPaymentWidth] = chipsOf({ showPosition: true })
    expect(pillWidth).toBeGreaterThan(typeWidth)
    expect(pillPaymentWidth).toBe(paymentWidth)
  })

  it('draws no chips when the theme hides the order type, as the card (the position\'s pill is the type\'s place)', () => {
    const noType = themeWith({ visibility: { 'orders.order_type': false } })
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton showPosition />, { themeOverrides: noType })
    expect(boneHeights(getByTestId('order-list-item-skeleton'))).toEqual([bandLine, logo, store, title, figure, stop, buttons])
  })

  it('has the height of a card that has a position: the chips\' row is as tall as its tallest bone, a badge', () => {
    // The cause of the 11 dp (Android, cold launch): the row was drawn as tall as the position's setter chip (sm, 32) while a card with
    // its position set draws a badge (sm, 20). The row of a card is as tall as its tallest chip.
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton showPosition />)
    const chipsRow = getByTestId('order-list-item-skeleton').findAll((node: any) => typeof node.type === 'string' && flat(node)?.flexWrap === 'wrap' && flat(node)?.marginTop === undefined)[0]
    const heights = chipsRow.findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number').map((node: any) => flat(node).height)
    expect(Math.max(...heights)).toBe(badge)
  })

  it('draws the position\'s setter chip, then the type and the payment, for the Assigned tab: its offered cards have no position yet', () => {
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton showPosition showSetter />)
    const row = getByTestId('order-list-item-skeleton')
    expect(boneHeights(row)).toEqual([bandLine, logo, store, title, figure, stop, chip.height, badge, badge, buttons])
    // The chips' row is as tall as its tallest chip, the setter's: the height of the card with no position (562 px on the Android pass, 531 with one).
    const chipsRow = row.findAll((node: any) => typeof node.type === 'string' && flat(node)?.flexWrap === 'wrap' && flat(node)?.marginTop === undefined)[0]
    const heights = chipsRow.findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number').map((node: any) => flat(node).height)
    expect(Math.max(...heights)).toBe(chip.height)
    // That is the badge's height plus the difference the list shifted by.
    expect(chip.height - badge).toBe(12)
  })

  it('draws the setter as wide as the card\'s glyph-only chip, and the type as wide as without a position (not the pill\'s)', () => {
    const widths = (props: any) => {
      const { getByTestId } = renderWithProviders(<OrderListItemSkeleton {...props} />)
      const chipsRow = getByTestId('order-list-item-skeleton').findAll((node: any) => typeof node.type === 'string' && flat(node)?.flexWrap === 'wrap' && flat(node)?.marginTop === undefined)[0]
      return chipsRow.findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number').map((node: any) => flat(node).width)
    }
    const [typeWidth] = widths({})
    const [setterWidth, withSetterType] = widths({ showPosition: true, showSetter: true })
    expect(setterWidth).toBe(theme.native.tokens.icon.sm + 2 * chip.padding_x)
    expect(withSetterType).toBe(typeWidth)
  })

  it('draws no setter unless asked, and the list passes it on to every card', () => {
    const none = renderWithProviders(<OrderListItemSkeleton showPosition />)
    expect(boneHeights(none.getByTestId('order-list-item-skeleton'))).not.toContain(chip.height)
    const list = renderWithProviders(<OrderListSkeleton count={2} showPosition showSetter />)
    for (const row of list.getAllByTestId('order-list-item-skeleton')) expect(boneHeights(row)).toContain(chip.height)
  })

  it('draws the header and the buttons for an assign request, as its card has no stop, status or chips', () => {
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton logistic />)
    expect(boneHeights(getByTestId('order-list-item-skeleton'))).toEqual([logo, store, title, buttons])
  })

  it('leaves out what the theme hides, as the card does (a hidden piece draws no view)', () => {
    const hidden = themeWith({ visibility: { 'orders.business_logo': false, 'orders.order_type': false, 'orders.order_status': false } })
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton />, { themeOverrides: hidden })
    expect(boneHeights(getByTestId('order-list-item-skeleton'))).toEqual([store, title, figure, stop, buttons])
  })

  describe('has the height of the card it stands for', () => {
    const footerOf = (row: any) => row.findAll((node: any) => typeof node.type === 'string' && flat(node)?.marginTop === gap)

    it('draws the band edge to edge on the neutral badge\'s tint, with the card\'s band box (its negative margins and rounded corners)', () => {
      const { getByTestId } = renderWithProviders(<OrderListItemSkeleton showTimer />)
      const band = flat(getByTestId('order-list-item-skeleton-band'))
      expect(band).toEqual(expect.objectContaining(StyleSheet.flatten(loaded.band)))
      expect(band.backgroundColor).toBe(theme.native.components.badge.variants.neutral.background)
      expect(band.marginHorizontal).toBe(-theme.native.components.card.base.padding)
      expect(band.marginTop).toBe(-theme.native.components.card.base.padding)
      expect(band.borderTopLeftRadius).toBeGreaterThan(0)
    })

    it('adds the buttons of an open order: one bone as tall as the card\'s button, `sm` under the body, as wide as the card', () => {
      const { getByTestId } = renderWithProviders(<OrderListItemSkeleton />)
      const row = getByTestId('order-list-item-skeleton')
      const footers = footerOf(row)
      expect(footers).toHaveLength(1)
      const bones = footers[0].findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number')
      expect(bones.map((node: any) => flat(node).height)).toEqual([buttons])
      expect(flat(bones[0]).borderRadius).toBe(theme.native.components.button.base.radius)
    })

    it('draws neither stop line nor buttons on a tab of orders that are over, as their cards have none', () => {
      const { getByTestId } = renderWithProviders(<OrderListItemSkeleton closed showTimer />)
      const row = getByTestId('order-list-item-skeleton')
      expect(boneHeights(row)).toEqual([bandLine, bandLine, logo, store, title, figure, badge, badge])
      expect(footerOf(row)).toHaveLength(0)
    })

    it('draws no buttons where the theme hides the quick actions', () => {
      const off = themeWith({ visibility: { 'orders.quick_actions': false } })
      const { getByTestId } = renderWithProviders(<OrderListItemSkeleton />, { themeOverrides: off })
      expect(boneHeights(getByTestId('order-list-item-skeleton'))).toEqual([bandLine, logo, store, title, figure, stop, badge, badge])
    })

    it('draws as many rows of the list as asked with the shape the tab says (closed passes through the list)', () => {
      const { getAllByTestId } = renderWithProviders(<OrderListSkeleton count={3} closed />)
      for (const row of getAllByTestId('order-list-item-skeleton')) expect(footerOf(row)).toHaveLength(0)
    })
  })

  describe('the slot of the route\'s entry button (the In Progress tab)', () => {
    const button = theme.native.components.button
    const slot = (screen: any) => screen.queryByTestId('order-list-skeleton-route')

    it('starts the list with a bone as tall as the entry button (an `md` button), the list\'s gap under it, before the first card', () => {
      const screen = renderWithProviders(<OrderListSkeleton count={2} routeEntry />)
      const bone = slot(screen)
      expect(flat(bone).height).toBe(button.sizes.md.height)
      expect(flat(bone).borderRadius).toBe(button.base.radius)
      expect(screen.getAllByTestId(/^(order-list-skeleton-route|order-list-item-skeleton)$/).map((node: any) => node.props.testID))
        .toEqual(['order-list-skeleton-route', 'order-list-item-skeleton', 'order-list-item-skeleton'])
      // One gap between the bone and the first card, as between the cards: the list's.
      expect(flat(screen.getByTestId('order-list-skeleton')).gap).toBe(theme.native.tokens.space.md)
    })

    it('is not drawn unless asked (the other tabs\' lists have no such button)', () => {
      expect(slot(renderWithProviders(<OrderListSkeleton count={2} />))).toBeNull()
    })

    it('follows the button\'s size in a theme that changes it', () => {
      const taller = themeWith({ components: { button: { sizes: { md: { height: 52 } } } } } as any)
      const screen = renderWithProviders(<OrderListSkeleton count={1} routeEntry />, { themeOverrides: taller })
      expect((taller as any).native.components.button.sizes.md.height).toBe(52)
      expect(flat(slot(screen)).height).toBe(52)
    })
  })

  it('follows a theme that changes the skeleton\'s color', () => {
    const custom = themeWith({ components: { skeleton: { base: { color: '#123456' } } } })
    const { getByTestId } = renderWithProviders(<OrderListItemSkeleton />, { themeOverrides: custom })
    const bone = getByTestId('order-list-item-skeleton')
      .findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number')[0]
    expect(flat(bone).backgroundColor).toBe('#123456')
  })
})

describe('orderCardPieces', () => {
  const enterprise = { plan_enterprise: { value: '1' } }

  it('shows the remaining time on the tabs of open orders, on the enterprise plan only', () => {
    expect(orderCardPieces('pending', enterprise).timer).toBe(true)
    expect(orderCardPieces('inProgress', enterprise).timer).toBe(true)
    expect(orderCardPieces('active', enterprise).timer).toBe(true)
    expect(orderCardPieces('completed', enterprise).timer).toBe(false)
    expect(orderCardPieces('cancelled', enterprise).timer).toBe(false)
    expect(orderCardPieces('pending', {}).timer).toBe(false)
  })

  it('has the setter on the tabs that hold offered orders (Assigned, and a combined project\'s Active) of a project that orders by position', () => {
    expect(orderCardPieces('pending', {}).setter).toBe(true)
    expect(orderCardPieces('active', {}).setter).toBe(true)
    expect(orderCardPieces('active', { disable_delivery_priority: { value: '1' } }).setter).toBe(false)
    expect(orderCardPieces('inProgress', {}).setter).toBe(false)
    expect(orderCardPieces('completed', {}).setter).toBe(false)
    expect(orderCardPieces('pending', { disable_delivery_priority: { value: '1' } }).setter).toBe(false)
  })

  it('shows the clock time of an order that is over on the tabs of completed and cancelled orders, with or without the plan', () => {
    expect(orderCardPieces('completed', {}).closedTime).toBe(true)
    expect(orderCardPieces('cancelled', enterprise).closedTime).toBe(true)
    expect(orderCardPieces('pending', enterprise).closedTime).toBe(false)
    expect(orderCardPieces('inProgress', {}).closedTime).toBe(false)
  })

  it('shows the position chip when the project orders by position, not on closed tabs', () => {
    expect(orderCardPieces('pending', {}).position).toBe(true)
    expect(orderCardPieces('completed', {}).position).toBe(false)
    expect(orderCardPieces('cancelled', {}).position).toBe(false)
    expect(orderCardPieces('pending', { disable_delivery_priority: { value: '1' } }).position).toBe(false)
  })

  it('draws neither on an assign request', () => {
    expect(orderCardPieces('logisticOrders', enterprise, true)).toEqual({ timer: false, closedTime: false, position: false, setter: false })
    expect(orderCardPieces('pending', enterprise, true)).toEqual({ timer: false, closedTime: false, position: false, setter: false })
  })
})
