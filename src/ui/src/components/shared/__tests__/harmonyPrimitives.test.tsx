import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { defaultAppTheme } from '../../../../../theme/engine'
import { themeRadius } from '../../../../../theme/helpers'
import { OAvatar, OBottomPopup, OModal } from '../index'
import { closeButtonInset } from '../styles'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('one look per control (harmony H5): the dialog\'s close, the sheet\'s padding, the store\'s logo', () => {
  const theme = defaultAppTheme()
  const components = theme.native.components

  describe('OModal with box', () => {
    it('has no close button unless asked', () => {
      const { queryByLabelText, getByText } = renderWithProviders(
        <OModal open box title='Requirements' testID='dialog' onClose={jest.fn()}><Text>content</Text></OModal>
      )
      expect(queryByLabelText('Close')).toBeNull()
      // The title is the box's direct child, as before.
      expect(flat(getByText('Requirements')).paddingEnd).toBeUndefined()
    })

    it('draws the modal\'s close button in its title row when closable, and closes with it', () => {
      const onClose = jest.fn()
      const { getByLabelText, getByTestId, getByText } = renderWithProviders(
        <OModal open box closable title='Requirements' testID='dialog' onClose={onClose}><Text>content</Text></OModal>
      )
      expect(getByText('Requirements')).toBeTruthy()
      expect(getByText('content')).toBeTruthy()
      fireEvent.press(getByLabelText('Close'))
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(getByTestId('dialog-close')).toBeTruthy()
    })

    it('keeps the title clear of the close button, whose glyph sits on the box\'s padding', () => {
      const { getByText, getByTestId } = renderWithProviders(
        <OModal open box closable title='Requirements' testID='dialog' onClose={jest.fn()}><Text>content</Text></OModal>
      )
      // An icon-only button's glyph is the shape's (`button.shapes.icon.icon_size`).
      const icon = components.button.shapes.icon.icon_size
      expect(flat(getByText('Requirements')).paddingEnd).toBe(icon + theme.native.tokens.space.sm)
      // The button's wrapper: the dialog's close, laid from the box's top and end.
      let holder: any = getByTestId('dialog-close')
      while (holder && flat(holder)?.position !== 'absolute') holder = holder.parent
      const edge = components.modal.base.padding - closeButtonInset(theme)
      expect(flat(holder)).toEqual(expect.objectContaining({ position: 'absolute', top: edge, end: edge }))
      expect(edge).toBeGreaterThanOrEqual(0)
    })

    it('still has its close button without a title', () => {
      const onClose = jest.fn()
      const { getByLabelText } = renderWithProviders(
        <OModal open box closable onClose={onClose}><Text>content</Text></OModal>
      )
      fireEvent.press(getByLabelText('Close'))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('OBottomPopup', () => {
    const padding = components.sheet.base.padding
    const bottomSpace = components.bottom_nav.base.min_bottom_space
    /** The nearest view above `node` whose style has `property`, with its style. */
    const above = (node: any, property: string) => {
      let host = node.parent
      while (host && flat(host)?.[property] === undefined) host = host.parent
      return { host, style: host ? flat(host) : undefined }
    }

    it('leaves its body to the caller unless asked', () => {
      const { getByText } = renderWithProviders(
        <OBottomPopup open title='Sheet' onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      // The first padded view above the body is the sheet's own, which keeps the system space.
      const { style } = above(getByText('body'), 'paddingBottom')
      expect(style.paddingBottom).toBe(bottomSpace)
      expect(style.paddingHorizontal).toBeUndefined()
    })

    it('owns the padding of its body when padded: the sheet\'s padding at the sides and under it', () => {
      const { getByText } = renderWithProviders(
        <OBottomPopup open padded title='Sheet' onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      const { style } = above(getByText('body'), 'paddingHorizontal')
      expect(style.paddingHorizontal).toBe(padding)
      expect(style.paddingBottom).toBe(padding)
      expect(style.paddingTop).toBeUndefined()
    })

    it('adds that padding over the system space it keeps at the bottom', () => {
      const { getByText } = renderWithProviders(
        <OBottomPopup open padded title='Sheet' onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      // Up from the body's view (a view shows twice in the tree, as a component and as its host).
      let host = above(getByText('body'), 'paddingHorizontal').host
      while (host && flat(host)?.paddingHorizontal !== undefined) host = host.parent
      const keeper = flat(host)?.paddingBottom !== undefined ? flat(host) : above(host, 'paddingBottom').style
      expect(keeper.paddingBottom).toBe(bottomSpace)
    })

    it('pads nothing that is drawn outside the sheet', () => {
      const { getByText } = renderWithProviders(
        <OBottomPopup open padded childenOutsideContainer onClose={jest.fn()}><Text>outside</Text></OBottomPopup>
      )
      expect(above(getByText('outside'), 'paddingHorizontal').host).toBeNull()
    })
  })

  describe('OAvatar', () => {
    it('frames a store\'s logo in the rounded square by default', () => {
      const { getByTestId } = renderWithProviders(<OAvatar kind='business' testID='logo' />)
      expect(flat(getByTestId('logo')).borderRadius).toBe(themeRadius(theme, 'sm'))
    })

    it('keeps a person round (the avatar\'s own radius)', () => {
      const { getByTestId } = renderWithProviders(<OAvatar testID='person' />)
      expect(flat(getByTestId('person')).borderRadius).toBe(components.avatar.base.radius)
      expect(components.avatar.base.radius).not.toBe(themeRadius(theme, 'sm'))
    })

    // The profile's photo gives its own (`components.profile_photo`).
    it('lets a caller give its own radius, for either kind', () => {
      const { getByTestId } = renderWithProviders(<OAvatar kind='business' radius={7} testID='own' />)
      expect(flat(getByTestId('own')).borderRadius).toBe(7)
    })
  })
})
