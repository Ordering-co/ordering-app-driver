import React from 'react'
import { StyleSheet } from 'react-native'

import { ProfileSkeleton, profileSkeletonMetrics } from '../ProfileSkeleton'
import { profileStyles } from '../styles'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const bonesOf = (root: any) => root
  .findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number')
  .map((node: any) => flat(node))

describe('ProfileSkeleton', () => {
  const theme: any = defaultAppTheme()
  const m = profileSkeletonMetrics(theme)
  const photo = theme.native.components.profile_photo.base

  it('is laid out with the profile\'s own content style (its gutter, its room below and the sections `lg` apart)', () => {
    const { getByTestId } = renderWithProviders(<ProfileSkeleton />)
    const content = flat(getByTestId('profile-skeleton'))
    const loaded = StyleSheet.flatten(profileStyles(theme).content)
    expect(content.paddingHorizontal).toBe(loaded.paddingHorizontal)
    expect(content.paddingBottom).toBe(loaded.paddingBottom)
    expect(content.gap).toBe(loaded.gap)
    expect(content.paddingTop).toBeUndefined()
  })

  it('draws the photo at its size, the three lines of who the driver is, the availability and a card of rows per section', () => {
    const { UNSAFE_root } = renderWithProviders(<ProfileSkeleton />)
    const bones = bonesOf(UNSAFE_root)
    expect(bones[0].height).toBe(photo.size)
    expect(bones[0].borderRadius).toBe(photo.radius)
    // In the order of the page: photo, name, e-mail, phone, availability, then each section's title and rows.
    expect(bones.map((bone: any) => bone.height)).toEqual([
      m.photo, m.name, m.meta, m.meta,
      m.availability,
      m.title, ...Array.from({ length: 5 }, () => m.rowTitle),
      m.title, ...Array.from({ length: 3 }, () => m.rowTitle)
    ])
  })

  it('takes its metrics from the same places the loaded pieces are drawn with', () => {
    expect(m.name).toBe(photo.text.lineHeight)
    expect(m.meta).toBe(theme.native.components.list_row.base.subtitle.lineHeight)
    expect(m.rowTitle).toBe(theme.native.components.list_row.base.title.lineHeight)
    expect(m.rowPadding).toBe(theme.native.components.list_row.base.padding_y)
    // The profile's own small section titles (`account_page.title`), not the shared section title.
    expect(m.title).toBe(theme.native.components.account_page.base.title.lineHeight)
    expect(m.titleGap).toBe(theme.native.components.section_header.base.margin_bottom)
    expect(m.availability).toBe(theme.native.tokens.size.sm + 2 * theme.native.tokens.space.md)
  })

  it('draws no bone for a section the theme hides', () => {
    const custom = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: {
        pages: {
          profile: {
            sections: ['profile_photo', 'availability', 'information', 'account', 'language', 'logout', 'delete_account']
              .map((key) => ({ key, visible: !['availability', 'account'].includes(key) }))
          }
        }
      }
    })
    const { UNSAFE_root } = renderWithProviders(<ProfileSkeleton />, { themeOverrides: custom })
    const heights = bonesOf(UNSAFE_root).map((bone: any) => bone.height)
    expect(heights).toEqual([m.photo, m.name, m.meta, m.meta, m.title, ...Array.from({ length: 5 }, () => m.rowTitle)])
  })
})
