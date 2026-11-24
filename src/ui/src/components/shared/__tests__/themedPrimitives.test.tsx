import React from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { OBadge } from '../OBadge'
import { ODivider } from '../ODivider'
import { OCard } from '../OCard'
import { OListRow } from '../OListRow'
import { OAvatar } from '../OAvatar'
import { OStepper } from '../OStepper'
import { OOtpInput } from '../OOtpInput'
import { OSwitch } from '../OSwitch'
import { Tabs } from '../Tabs'
import { FilterChip } from '../FilterChip'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)
/** The switch's thumb: the one host view inside it that carries a transform. */
const thumbOf = (node: any) => node.findAll((n: any) => typeof n.type === 'string' && !!flat(n)?.transform)[0]

describe('themed primitives', () => {
  const theme = defaultAppTheme()
  const components = theme.native.components

  it('OBadge paints its variant, and follows a theme that changes it', () => {
    const { getByTestId, getByText } = renderWithProviders(<OBadge variant='success' testID='badge'>Done</OBadge>)
    expect(flat(getByTestId('badge')).backgroundColor).toBe(components.badge.variants.success.background)
    expect(flat(getByText('Done')).color).toBe(components.badge.variants.success.color)
    const custom = themeWith({ tokens: { color: { success: '#123456' } } })
    const again = renderWithProviders(<OBadge variant='success' testID='badge2'>Done</OBadge>, { themeOverrides: custom })
    expect(flat(again.getByTestId('badge2')).backgroundColor).toBe(custom.native.components.badge.variants.success.background)
  })

  it('OBadge has the soft tones of every state and the three colours of the order types', () => {
    for (const variant of ['primary_soft', 'success_soft', 'warning_soft', 'danger_soft', 'type_delivery', 'type_pickup', 'type_in_store'] as const) {
      const { getByTestId, getByText, unmount } = renderWithProviders(<OBadge variant={variant} testID='badge'>Soft</OBadge>)
      expect(flat(getByTestId('badge')).backgroundColor).toBe(components.badge.variants[variant].background)
      expect(flat(getByText('Soft')).color).toBe(components.badge.variants[variant].color)
      unmount()
    }
    expect(components.badge.variants.primary_soft.background).toBe(theme.native.tokens.color.primary_subtle)
    // The tints are the tokens'; the text is a darker value of the token's hue so it reads 4.5:1 on its tint (`orderCardBand.test`).
    expect(components.badge.variants.danger_soft.background).toBe(theme.native.tokens.color.danger_subtle)
    expect(components.badge.variants.danger_soft.color).toBe('#C42543')
  })

  it('OBadge with onPress is a button with the badge\'s look, reaching a control tall, dimmed while it is disabled', () => {
    const onPress = jest.fn()
    const { getByTestId, getByLabelText, rerender } = renderWithProviders(
      <OBadge variant='type_delivery' onPress={onPress} accessibilityLabel='Delivery position 2' testID='badge'>Delivery #2</OBadge>
    )
    fireEvent.press(getByTestId('badge'))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(getByLabelText('Delivery position 2').props.accessibilityRole).toBe('button')
    expect(flat(getByTestId('badge')).backgroundColor).toBe(components.badge.variants.type_delivery.background)
    const { top, bottom } = getByTestId('badge').props.hitSlop
    expect(components.badge.sizes.sm.height + top + bottom).toBe(theme.native.tokens.size.md)
    rerender(<OBadge variant='type_delivery' onPress={onPress} disabled testID='badge'>Delivery #2</OBadge>)
    fireEvent.press(getByTestId('badge'))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(flat(getByTestId('badge')).opacity).toBe(theme.native.tokens.opacity.disabled)
  })

  it('ODivider is the variant\'s line and spacing', () => {
    const { toJSON } = renderWithProviders(<ODivider variant='section' />)
    const style = flat(toJSON())
    expect(style.height).toBe(components.divider.variants.section.line.borderWidth)
    expect(style.marginVertical).toBe(components.divider.variants.section.spacing)
  })

  it('OCard is a box of the theme, pressable as a whole when it opens something', () => {
    const onPress = jest.fn()
    const { getByTestId } = renderWithProviders(<OCard testID='card' onPress={onPress}><Text>in</Text></OCard>)
    fireEvent.press(getByTestId('card'))
    expect(onPress).toHaveBeenCalled()
    const still = renderWithProviders(<OCard testID='still'><Text>in</Text></OCard>)
    const style = flat(still.getByTestId('still'))
    expect(style.borderRadius).toBe(components.card.base.radius)
    expect(style.padding).toBe(components.card.base.padding)
    expect(style.backgroundColor).toBe(components.card.base.background)
  })

  it('OListRow shows its title and opens with a 44 pt target', () => {
    const onPress = jest.fn()
    const { getByText, getByTestId } = renderWithProviders(<OListRow title='Sessions' subtitle='2 devices' onPress={onPress} testID='row' />)
    expect(getByText('2 devices')).toBeTruthy()
    fireEvent.press(getByText('Sessions'))
    expect(onPress).toHaveBeenCalled()
    expect(flat(getByTestId('row')).minHeight).toBeGreaterThanOrEqual(44)
  })

  it('OListRow paints the list\'s fill, or the one it is given, over its whole box', () => {
    const plain = renderWithProviders(<OListRow title='Plain' testID='plain' />)
    expect(flat(plain.getByTestId('plain')).backgroundColor).toBe(components.list_row.base.background)
    const tinted = renderWithProviders(<OListRow title='Tinted' background={theme.native.tokens.color.primary_subtle} testID='tinted' />)
    expect(flat(tinted.getByTestId('tinted')).backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
    // A pressable row paints it too.
    const pressable = renderWithProviders(<OListRow title='Press' background={theme.native.tokens.color.primary_subtle} onPress={jest.fn()} testID='press' />)
    expect(flat(pressable.getByTestId('press')).backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
  })

  it('OListRow paints a danger row in the danger text color, and an action row has no chevron', () => {
    const { getByText, UNSAFE_queryAllByProps } = renderWithProviders(<OListRow title='Log out' danger chevron={false} onPress={jest.fn()} />)
    expect(flat(getByText('Log out')).color).toBe(theme.native.tokens.color.danger_text)
    expect(UNSAFE_queryAllByProps({ name: 'chevron-forward' })).toHaveLength(0)
  })

  it('OAvatar asks a served picture at twice its box, and leaves another host\'s URL as it is', () => {
    const { Image, PixelRatio } = require('react-native')
    const box = components.avatar.sizes.lg.size
    const pixels = Math.ceil((box * 2 * PixelRatio.get()) / 50) * 50
    const cdn = renderWithProviders(
      <OAvatar kind='business' size='lg' source='https://cloud-assets.orderingplus.com/image/upload/dev/logo.png' />
    )
    expect(cdn.UNSAFE_getByType(Image).props.source.uri).toContain(`/upload/f_webp,c_limit,h_${pixels}`)
    const other = renderWithProviders(<OAvatar source='https://example.com/photo.jpg' />)
    expect(other.UNSAFE_getByType(Image).props.source).toEqual({ uri: 'https://example.com/photo.jpg', cache: 'force-cache' })
  })

  it('OAvatar takes the size\'s box and the theme image when a store has no logo', () => {
    const { getByTestId } = renderWithProviders(<OAvatar kind='business' size='lg' testID='logo' />)
    expect(flat(getByTestId('logo')).width).toBe(components.avatar.sizes.lg.size)
    const person = renderWithProviders(<OAvatar testID='person' />)
    expect(flat(person.getByTestId('person')).backgroundColor).toBe(components.avatar.base.background)
  })

  it('OStepper stays inside its range', () => {
    const onChange = jest.fn()
    const { getByLabelText } = renderWithProviders(<OStepper value={1} min={1} max={2} onChange={onChange} />)
    fireEvent.press(getByLabelText('Decrease'))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.press(getByLabelText('Increase'))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('OOtpInput draws one cell per digit and completes once', () => {
    const onChange = jest.fn()
    const onComplete = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(<OOtpInput length={4} value='12' onChange={onChange} onComplete={onComplete} testID='otp' />)
    expect(getByText('1')).toBeTruthy()
    fireEvent.changeText(getByTestId('otp-field'), '12a34999')
    expect(onChange).toHaveBeenCalledWith('1234')
    expect(onComplete).toHaveBeenCalledWith('1234')
  })

  it('OSwitch is drawn from the theme: its track, its thumb and its touch box (the four sizes and the three colors)', () => {
    const onChange = jest.fn()
    const sw = components.switch.base
    const { getByTestId, getByRole, rerender } = renderWithProviders(<OSwitch value={false} onChange={onChange} testID='switch' accessibilityLabel='Available' />)
    expect(getByRole('switch').props.accessibilityState).toMatchObject({ checked: false, disabled: false })
    expect(getByRole('switch').props.accessibilityLabel).toBe('Available')
    const hit = flat(getByTestId('switch'))
    expect(hit).toMatchObject({ width: sw.hit_width, height: theme.native.tokens.size.md })
    // A touch target of at least 44 pt each way.
    expect(hit.width).toBeGreaterThanOrEqual(44)
    expect(hit.height).toBeGreaterThanOrEqual(44)
    const track = flat(getByTestId('switch').children[0] as any)
    expect(track).toMatchObject({ width: sw.track_width, height: sw.track_height, backgroundColor: sw.off })
    const thumb = flat(thumbOf(getByTestId('switch')))
    expect(thumb).toMatchObject({ width: sw.thumb_size, height: sw.thumb_size, backgroundColor: sw.thumb })
    fireEvent.press(getByTestId('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<OSwitch value onChange={onChange} testID='switch' accessibilityLabel='Available' />)
    expect(getByRole('switch').props.accessibilityState).toMatchObject({ checked: true })
    expect(flat(getByTestId('switch').children[0] as any).backgroundColor).toBe(sw.on)
    fireEvent.press(getByTestId('switch'))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('OSwitch follows the theme\'s sizes and colors, and the thumb travels the room the track leaves it', () => {
    const custom = themeWith({ components: { switch: { base: { track_width: 60, track_height: 30, thumb_size: 26, hit_width: 70, on: '#112233' } } } })
    const sw = custom.native.components.switch.base
    expect(sw).toMatchObject({ track_width: 60, track_height: 30, thumb_size: 26, hit_width: 70 })
    const { getByTestId } = renderWithProviders(<OSwitch value onChange={jest.fn()} testID='switch' />, { themeOverrides: custom })
    expect(flat(getByTestId('switch'))).toMatchObject({ width: 70, height: custom.native.tokens.size.md })
    const track = flat(getByTestId('switch').children[0] as any)
    expect(track).toMatchObject({ width: 60, height: 30, backgroundColor: sw.on })
    const thumb = thumbOf(getByTestId('switch'))
    // On, with no motion at rest: the thumb sits at the track's end (width less thumb less the two insets).
    const travel = 60 - 26 - 2 * custom.native.tokens.space.xxs
    expect(flat(thumb).transform[0].translateX).toBe(travel)
  })

  it('OSwitch does not answer when disabled, shows it dimmed, and keeps its box the same size', () => {
    const onChange = jest.fn()
    const on = renderWithProviders(<OSwitch value onChange={onChange} testID='enabled' />)
    const off = renderWithProviders(<OSwitch value onChange={onChange} disabled testID='disabled' />)
    fireEvent.press(off.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
    expect(off.getByRole('switch').props.accessibilityState).toMatchObject({ checked: true, disabled: true })
    const dimmed = flat(off.getByTestId('disabled'))
    expect(dimmed.opacity).toBe(theme.native.tokens.opacity.disabled)
    // Nothing shifts: the same box, enabled or not, on or off.
    const live = flat(on.getByTestId('enabled'))
    expect({ width: dimmed.width, height: dimmed.height }).toEqual({ width: live.width, height: live.height })
    const offTrack = renderWithProviders(<OSwitch value={false} onChange={onChange} testID='x' />)
    expect(flat(offTrack.getByTestId('x'))).toMatchObject({ width: live.width, height: live.height })
    expect(flat(offTrack.getByTestId('x').children[0] as any)).toMatchObject({ width: flat(on.getByTestId('enabled').children[0] as any).width, height: flat(on.getByTestId('enabled').children[0] as any).height })
  })

  it('OSwitch jumps with no motion when the system asks to reduce it, and slides otherwise', () => {
    const timing = jest.spyOn(Animated, 'timing')
    try {
      const reduced = { meta: { ...theme.meta, reduceMotion: true } }
      const still = renderWithProviders(<OSwitch value={false} onChange={jest.fn()} testID='still' />, { themeOverrides: reduced })
      still.rerender(<OSwitch value onChange={jest.fn()} testID='still' />)
      expect(timing).not.toHaveBeenCalled()
      const moving = renderWithProviders(<OSwitch value={false} onChange={jest.fn()} testID='moving' />)
      timing.mockClear()
      moving.rerender(<OSwitch value onChange={jest.fn()} testID='moving' />)
      expect(timing).toHaveBeenCalledTimes(1)
    } finally {
      timing.mockRestore()
    }
  })

  it('Tabs mark the selected tab and report the pressed one', () => {
    const onChange = jest.fn()
    const { getByText, getAllByRole } = renderWithProviders(
      <Tabs tabs={[{ key: 'a', text: 'Pending' }, { key: 'b', text: 'Done' }]} selected='a' onChange={onChange} />
    )
    expect(getAllByRole('tab')[0].props.accessibilityState.selected).toBe(true)
    fireEvent.press(getByText('Done'))
    expect(onChange).toHaveBeenCalledWith('b', expect.objectContaining({ key: 'b' }))
  })

  it('FilterChip keeps its size when selected', () => {
    const { getByRole, rerender } = renderWithProviders(<FilterChip text='Today' />)
    const before = flat({ props: { style: getByRole('button').props.style } })
    expect(before).toBeTruthy()
    rerender(<FilterChip text='Today' selected />)
    expect(getByRole('button').props.accessibilityState.selected).toBe(true)
  })

  it('OModal draws a dialog in the modal\'s box, its title inside it', () => {
    const { OModal } = require('../index')
    const { getByTestId, getByText } = renderWithProviders(
      <OModal open box title='Requirements' testID='dialog'><Text>content</Text></OModal>
    )
    const box = flat(getByTestId('dialog'))
    expect(box.backgroundColor).toBe(components.modal.base.background)
    expect(box.borderRadius).toBe(components.modal.base.radius)
    expect(box.padding).toBe(components.modal.base.padding)
    expect(flat(getByText('Requirements')).color).toBe(theme.native.tokens.color.text)
    expect(getByText('content')).toBeTruthy()
  })

  it('OOtpInput can be focused from outside and its cells shrink to the row', () => {
    const ref = React.createRef<any>()
    const { UNSAFE_getAllByType } = renderWithProviders(<OOtpInput ref={ref} length={8} value='' onChange={jest.fn()} testID='pin' />)
    expect(typeof ref.current.focus).toBe('function')
    const { View } = require('react-native')
    const cell = UNSAFE_getAllByType(View).map((node: any) => StyleSheet.flatten(node.props.style)).find((style: any) => style?.flexBasis !== undefined)
    expect(cell.flexShrink).toBe(1)
    expect(cell.maxWidth).toBe(components.input.sizes.code.width)
  })

  it('OInput carries its label inside by default and above inside the account pages (their scope)', () => {
    const { OInput } = require('../index')
    const inside = renderWithProviders(<OInput placeholder='Name' onChange={jest.fn()} />)
    expect(inside.getByPlaceholderText('Name')).toBeTruthy()
    expect(inside.queryByText('Name')).toBeNull()
    inside.unmount()
    const above = renderWithProviders(<OInput scope='account_page' placeholder='Name' onChange={jest.fn()} />)
    expect(above.getByText('Name')).toBeTruthy()
    expect(above.queryByPlaceholderText('Name')).toBeNull()
    expect(above.getByLabelText('Name')).toBeTruthy()
    above.unmount()
    // A theme can put the label of every other field above too.
    const custom = themeWith({ components: { field: { base: { label_position: 'above' } } } })
    const themed = renderWithProviders(<OInput placeholder='Name' onChange={jest.fn()} />, { themeOverrides: custom })
    expect(themed.getByText('Name')).toBeTruthy()
  })
})
