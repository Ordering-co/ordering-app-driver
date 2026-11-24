import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import OButton from '../OButton'
import OFab from '../OFab'
import OStepper from '../OStepper'
import OListRow from '../OListRow'
import ONavbar from '../ONavbar'
import ONotice from '../ONotice'
import { FilterChip } from '../FilterChip'
import { Tabs } from '../Tabs'
import { BackButton, ModalCloseButton, closeButtonInset } from '../styles'
import Icon from '../Icon'

/**
 * The sizes round of 2026-11-19: the app's sizes brought to the approved boards. Each new or changed key of the schema
 * has its reader here (the pieces that read it elsewhere have their own suites).
 */
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const themed = (values: any): any => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const theme: any = defaultAppTheme()
const { components, tokens } = theme.native

/** The glyph an element draws, by its Ionicons name: the innermost node, whose size is the painted number. */
const glyph = (view: any, name: string) => {
  const nodes = view.UNSAFE_getAllByProps({ name })
  return nodes[nodes.length - 1]
}

describe('the icons of the buttons follow the boards', () => {
  it('an icon-only button draws its glyph at the shape\'s size (22), one with a label at its size\'s (18)', () => {
    expect(components.button.shapes.icon.icon_size).toBe(22)
    expect(components.button.sizes.md.icon_size).toBe(18)
    const only = renderWithProviders(<OButton iconOnly accessibilityLabel='search' icon={<Icon name='search' />} />)
    expect(glyph(only, 'search').props.size).toBe(22)
    const labelled = renderWithProviders(<OButton text='Map' icon={<Icon name='navigate-outline' />} />)
    expect(glyph(labelled, 'navigate-outline').props.size).toBe(18)
  })

  it('a glyph with a size of its own keeps it: the stepper, the map\'s buttons and the camera stay at their boards\' sizes', () => {
    const stepper = renderWithProviders(<OStepper value={2} onChange={jest.fn()} />)
    expect(glyph(stepper, 'add').props.size).toBe(tokens.icon.md)
    const fab = renderWithProviders(<OFab iconName='locate' onPress={jest.fn()} />)
    expect(glyph(fab, 'locate').props.size).toBe(tokens.icon.md)
  })

  it('the back arrow is `icon.lg` (24) and the sheet\'s close the shape\'s 22', () => {
    const back = renderWithProviders(<BackButton onPress={jest.fn()} />)
    expect(glyph(back, 'arrow-back').props.size).toBe(tokens.icon.lg)
    const close = renderWithProviders(<ModalCloseButton onPress={jest.fn()} />)
    expect(glyph(close, 'close').props.size).toBe(components.button.shapes.icon.icon_size)
    const small = renderWithProviders(<ModalCloseButton onPress={jest.fn()} iconSize='md' />)
    expect(glyph(small, 'close').props.size).toBe(tokens.icon.md)
  })

  it('a theme that sets the shape\'s glyph moves every icon-only button that does not name its own', () => {
    const custom = themed({ components: { button: { shapes: { icon: { icon_size: 26 } }, sizes: { md: { icon_size: 14 } } } } })
    const only = renderWithProviders(<OButton iconOnly accessibilityLabel='go' icon={<Icon name='search' />} />, { themeOverrides: custom })
    expect(glyph(only, 'search').props.size).toBe(26)
    const labelled = renderWithProviders(<OButton text='Map' icon={<Icon name='navigate-outline' />} />, { themeOverrides: custom })
    expect(glyph(labelled, 'navigate-outline').props.size).toBe(14)
  })

  it('pulls the back arrow and a bar\'s actions into the gutter by half of their box\'s room (the glyph, not the box, on the edge)', () => {
    const inset = closeButtonInset(theme)
    expect(inset).toBe((components.button.sizes.md.height - tokens.icon.md) / 2)
    const bar = renderWithProviders(<ONavbar title='Orders' onBack={jest.fn()} right={<Text>a</Text>} rightButtons testID='bar' />)
    let holder: any = bar.getByText('a').parent
    while (holder && flat(holder)?.flexDirection !== 'row') holder = holder.parent
    expect(flat(holder).marginRight).toBe(-inset)
    // An avatar or a badge at the end keeps the gutter.
    const logo = renderWithProviders(<ONavbar title='Chat' right={<Text>logo</Text>} testID='bar' />)
    let plain: any = logo.getByText('logo').parent
    while (plain && flat(plain)?.flexDirection !== 'row') plain = plain.parent
    expect(flat(plain).marginRight).toBeUndefined()
  })
})

describe('the header lays its back button, title and actions one `header.gap` apart', () => {
  it('is 5 (`xs`) by default and the bar uses it between every child', () => {
    expect(components.header.base.gap).toBe(tokens.space.xs)
    const bar = renderWithProviders(<ONavbar title='Orders' onBack={jest.fn()} testID='bar' />)
    expect(flat(bar.getByTestId('bar')).gap).toBe(components.header.base.gap)
  })
})

describe('the list rows', () => {
  it('are 50 high at least with `sm` over and under, and a trailing chevron of its own size (18)', () => {
    const row = components.list_row.base
    expect(row.padding_y).toBe(tokens.space.sm)
    expect(row.trailing_icon_size).toBe(18)
    expect(row.icon_size).toBe(tokens.icon.md)
    const view = renderWithProviders(<OListRow title='Language' icon='globe-outline' onPress={jest.fn()} testID='row' />)
    expect(flat(view.getByTestId('row')).minHeight).toBe(tokens.size.lg)
    expect(flat(view.getByTestId('row')).paddingVertical).toBe(tokens.space.sm)
    // A row that only says something is 44, as the profile's information rows.
    const plain = renderWithProviders(<OListRow title='Name' subtitle='' testID='plain' />)
    expect(flat(plain.getByTestId('plain')).minHeight).toBe(tokens.size.md)
    // The leading glyph stays 20, the chevron is 18.
    expect(glyph(view, 'globe-outline').props.size).toBe(row.icon_size)
    expect(glyph(view, 'chevron-forward').props.size).toBe(row.trailing_icon_size)
  })

  it('a tall row takes `tall_min_height` (76), and its title can be followed by something on its line', () => {
    const row = components.list_row.base
    expect(row.tall_min_height).toBe(76)
    const view = renderWithProviders(<OListRow title='Wed' subtitle='11/18' tall titleEnd={<Text>Today</Text>} testID='row' />)
    expect(flat(view.getByTestId('row')).minHeight).toBe(row.tall_min_height)
    // The badge shares the title's line, `list_row.base.gap` from it.
    let line: any = view.getByText('Today').parent
    while (line && flat(line)?.flexDirection !== 'row') line = line.parent
    expect(flat(line).gap).toBe(row.gap)
    expect(line.findAll((node: any) => node.props?.children === 'Wed').length).toBeGreaterThan(0)
  })
})

describe('the stepper', () => {
  it('writes its number as `h3` in a box 28 wide at least, `sm` from its buttons', () => {
    const stepper = components.stepper.base
    expect(stepper.value).toEqual(tokens.typography.h3)
    expect(stepper.value_min_width).toBe(28)
    const view = renderWithProviders(<OStepper value={3} onChange={jest.fn()} testID='stepper' />)
    expect(flat(view.getByTestId('stepper')).gap).toBe(tokens.space.sm)
    const number = flat(view.getByText('3'))
    expect(number.fontSize).toBe(tokens.typography.h3.fontSize)
    expect(number.fontFamily).toBe(tokens.typography.h3.fontFamily)
    let box: any = view.getByText('3').parent
    while (box && flat(box)?.minWidth === undefined) box = box.parent
    expect(flat(box).minWidth).toBe(stepper.value_min_width)
  })
})

describe('the notices', () => {
  it('keep the theme\'s padding at their sides and `sm` over and under', () => {
    const view = renderWithProviders(<ONotice variant='info' testID='notice'>Link sent</ONotice>)
    const box = flat(view.getByTestId('notice'))
    expect(box.paddingHorizontal).toBe(components.alert.base.padding)
    expect(box.paddingVertical).toBe(tokens.space.sm)
    expect(box.padding).toBeUndefined()
  })
})

describe('what is chosen is semibold (600), in the room of its semibold copy', () => {
  const semibold = tokens.typography.label.fontFamily
  const regular = tokens.typography.body.fontFamily
  it('a selected chip and the selected tab', () => {
    const chips = renderWithProviders(<><FilterChip text='Selected' selected /><FilterChip text='Plain' /></>)
    expect(chips.getAllByText('Selected').map(flat).some((style) => style.fontFamily === semibold)).toBe(true)
    expect(chips.getAllByText('Plain').map(flat).every((style) => style.fontFamily === regular)).toBe(true)
    const tabs = renderWithProviders(<Tabs tabs={[{ key: 'a', text: 'Pending' }, { key: 'b', text: 'Done' }]} selected='a' onChange={jest.fn()} fill />)
    expect(tabs.getAllByText('Pending').map(flat).some((style) => style.fontFamily === semibold)).toBe(true)
    // Not bold (700): the file of the weight the boards draw.
    expect(tabs.getAllByText('Pending').map(flat).every((style) => style.fontFamily !== tokens.typography.h1.fontFamily)).toBe(true)
  })
})
