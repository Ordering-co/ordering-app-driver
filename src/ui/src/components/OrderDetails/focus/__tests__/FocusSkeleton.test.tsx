import React from 'react'
import { StyleSheet } from 'react-native'

import { FocusSkeleton, focusSkeletonMetrics } from '../FocusSkeleton'
import { OrderDetailsSkeleton } from '../../OrderDetailsSkeleton'
import { focusStyles } from '../styles'
import { deliveryStyles } from '../../styles'
import { renderWithProviders } from '../../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../../theme/engine'
import { themeText } from '../../../../../../theme/helpers'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const bonesOf = (root: any) => root
  .findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number')
  .map((node: any) => flat(node))

describe('FocusSkeleton', () => {
  const theme: any = defaultAppTheme()
  const m = focusSkeletonMetrics(theme)

  it('is the shape of the loaded page: the status row, the stop\'s card and three folded rows', () => {
    const { getByTestId, getAllByTestId } = renderWithProviders(<FocusSkeleton />)
    expect(getByTestId('order-details-skeleton')).toBeTruthy()
    expect(getByTestId('order-details-skeleton-stop')).toBeTruthy()
    expect(getAllByTestId('order-details-skeleton-card')).toHaveLength(3)
  })

  it('is laid out with the page\'s own scroll content style and the focus order\'s own gap', () => {
    const { getByTestId } = renderWithProviders(<FocusSkeleton />)
    const page = flat(getByTestId('order-details-skeleton'))
    const loaded = StyleSheet.flatten(deliveryStyles(theme, 0).content)
    expect(page.paddingHorizontal).toBe(loaded.paddingHorizontal)
    expect(page.gap).toBe(loaded.gap)
    expect(page.paddingTop).toBeUndefined()
    expect(StyleSheet.flatten(focusStyles(theme).order).gap).toBe(theme.native.tokens.space.md)
  })

  it('draws its cards with the focus layout\'s own styles', () => {
    const { getByTestId, getAllByTestId } = renderWithProviders(<FocusSkeleton />)
    const stop = flat(getByTestId('order-details-skeleton-stop'))
    expect(stop.gap).toBe(StyleSheet.flatten(focusStyles(theme).card).gap)
    expect(stop.padding).toBe(StyleSheet.flatten(focusStyles(theme).card).padding)
    const row = flat(getAllByTestId('order-details-skeleton-card')[0])
    expect(row.paddingHorizontal).toBe(StyleSheet.flatten(focusStyles(theme).foldCard).paddingHorizontal)
  })

  it('gives each bone the height of what it stands for: the badge, the texts, the stop\'s buttons, the rows\' chevron', () => {
    const { UNSAFE_root } = renderWithProviders(<FocusSkeleton />)
    expect(bonesOf(UNSAFE_root).map((bone: any) => bone.height)).toEqual([
      m.badge, m.meta,
      m.meta, m.name, m.line, m.button, m.button,
      m.line, m.chevron, m.line, m.chevron, m.line, m.chevron
    ])
    const slot = theme.native.components.order_details.slots.stop_map
    expect(m.button).toBe(theme.native.components.button.sizes[slot.size].height)
    expect(m.name).toBe(themeText(theme, 'h4').lineHeight)
  })

  it('leaves out the time when the theme hides it', () => {
    const custom: any = buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { visibility: { 'confirmation.order.eta': false } } })
    const { UNSAFE_root } = renderWithProviders(<FocusSkeleton />, { themeOverrides: custom })
    const heights = bonesOf(UNSAFE_root).map((bone: any) => bone.height)
    expect(heights.slice(0, 2)).toEqual([m.badge, m.meta])
    expect(heights).toHaveLength(12)
  })
})

describe('OrderDetailsSkeleton (the name the assign request\'s screen imports)', () => {
  it('is the focus skeleton', () => {
    expect(OrderDetailsSkeleton).toBe(FocusSkeleton)
    const { getByTestId, getAllByTestId } = renderWithProviders(<OrderDetailsSkeleton />)
    expect(getByTestId('order-details-skeleton')).toBeTruthy()
    expect(getByTestId('order-details-skeleton-stop')).toBeTruthy()
    expect(getAllByTestId('order-details-skeleton-card')).toHaveLength(3)
  })
})
