import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { KeyboardAvoidingView, StyleSheet } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  return buildD4MessagesUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { reviewCustomerDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      optimizeImage: (url: string) => url,
      parseDate: (v: string) => v
    }]),
    ReviewCustomer: renderUiController(reviewCustomerDefaults)
  }
})

import { ReviewCustomer } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { layoutWindowOf, onAndroid } from '../../../../../../jest/helpers/androidWindow'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { bottomBarClearance } from '../../../../../theme/helpers'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const theme = defaultAppTheme()
const pageSections: Array<{ key: string, visible: boolean }> = theme.values.pages.review.sections
/** The page `review` with one section hidden. */
const without = (key: string) => themeWith({
  pages: { review: { sections: pageSections.map((section) => section.key === key ? { ...section, visible: false } : section) } }
})
/** The nodes of a rendered tree, flat. */
const nodes = (tree: any): any[] => [tree].flat().flatMap((node: any) =>
  !node || typeof node === 'string' ? [] : [node, ...nodes(node.children ?? [])]
)
/** Where a piece of text or a test id first appears in the rendered tree. */
const at = (screen: any, piece: string) => JSON.stringify(screen.toJSON()).indexOf(piece)

describe('ReviewCustomer', () => {
  it('on Android gives its avoiding view the distance of its window from the screen\'s top (0 in the modal, which is a window of its own)', async () => {
    const android = onAndroid(0)
    const screen = renderWithProviders(<ReviewCustomer />)
    await layoutWindowOf(screen.UNSAFE_getByType(KeyboardAvoidingView))
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(0)
    android.restore()
    const inStack = onAndroid(63)
    const other = renderWithProviders(<ReviewCustomer />)
    await layoutWindowOf(other.UNSAFE_getByType(KeyboardAvoidingView))
    expect(other.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(63)
    inStack.restore()
  })

  it('renders customer review title and ratings', () => {
    const { getByText } = renderWithProviders(<ReviewCustomer />)
    expect(getByText('Great')).toBeTruthy()
    expect(getByText('Okay')).toBeTruthy()
    expect(getByText('Terrible')).toBeTruthy()
  })

  it('renders comment suggestions for selected rating', () => {
    const { getAllByText } = renderWithProviders(
      <ReviewCustomer reviewState={{ qualification: 5, comment: '' }} />
    )
    expect(getAllByText(/./).length).toBeGreaterThan(0)
  })

  it('changes qualification when rating is pressed', () => {
    const setReviewState = jest.fn()
    const { getByText } = renderWithProviders(
      <ReviewCustomer
        reviewState={{ qualification: 5, comment: '' }}
        setReviewState={setReviewState}
      />
    )
    fireEvent.press(getByText('Bad'))
    expect(setReviewState).toHaveBeenCalledWith(
      expect.objectContaining({ qualification: 2, comment: '' })
    )
  })

  it('sends review from floating button', () => {
    const handleSendCustomerReview = jest.fn()
    const { getByText } = renderWithProviders(
      <ReviewCustomer handleSendCustomerReview={handleSendCustomerReview} />
    )
    fireEvent.press(getByText('Send Review'))
    expect(handleSendCustomerReview).toHaveBeenCalled()
  })

  it('shows loading label while action is submitting', () => {
    const { getByText } = renderWithProviders(
      <ReviewCustomer actionState={{ loading: true, error: null }} />
    )
    expect(getByText('Loading')).toBeTruthy()
  })

  it('allows typing additional comments', () => {
    const { getByPlaceholderText } = renderWithProviders(<ReviewCustomer />)
    fireEvent.changeText(getByPlaceholderText('Comments'), 'Great customer')
    expect(getByPlaceholderText('Comments')).toBeTruthy()
  })

  it('goes back from its top bar', () => {
    const closeModal = jest.fn()
    const { getByLabelText, getByText } = renderWithProviders(<ReviewCustomer closeModal={closeModal} />)
    expect(getByText('Review customer')).toBeTruthy()
    fireEvent.press(getByLabelText('Go back'))
    expect(closeModal).toHaveBeenCalled()
  })

  describe('the scale (rating_scale)', () => {
    const scale = theme.native.components.rating_scale.base
    const segment = (screen: any, level: number) => flat(screen.getByTestId(`rating-segment-${level}`))

    it('is five separate segments side by side, each the scale\'s height and radius, apart by `xs`', () => {
      const screen = renderWithProviders(<ReviewCustomer reviewState={{ qualification: 0, comment: '' }} />)
      ;[1, 2, 3, 4, 5].forEach((level) => {
        expect(segment(screen, level)).toEqual(expect.objectContaining({ height: scale.height, borderRadius: scale.radius }))
      })
      // (The top bar is a row `xs` apart too: the scale is the one with the five levels.)
      const row = nodes(screen.toJSON()).find((node) => flat(node)?.flexDirection === 'row' && flat(node)?.gap === theme.native.tokens.space.xs && node.children?.length === 5)
      expect(row.children).toHaveLength(5)
      // Not one bar with ticks: no thin mark between the levels, no single track under a fill.
      expect(nodes(screen.toJSON()).filter((node) => flat(node)?.width === '0%')).toHaveLength(0)
    })

    it('fills the segments up to the chosen level with the fill color and leaves the others the track\'s', () => {
      const painted = (qualification: number) => {
        const screen = renderWithProviders(<ReviewCustomer reviewState={{ qualification, comment: '' }} />)
        const colors = [1, 2, 3, 4, 5].map((level) => segment(screen, level).backgroundColor)
        screen.unmount()
        return colors
      }
      expect(painted(0)).toEqual([scale.track, scale.track, scale.track, scale.track, scale.track])
      expect(painted(3)).toEqual([scale.fill, scale.fill, scale.fill, scale.track, scale.track])
      expect(painted(4)).toEqual([scale.fill, scale.fill, scale.fill, scale.fill, scale.track])
      expect(painted(5)).toEqual([scale.fill, scale.fill, scale.fill, scale.fill, scale.fill])
      expect(scale.fill).not.toBe(scale.track)
    })

    it('marks the chosen level with the active color, and each level is tall enough to tap', () => {
      const { getByText, getByLabelText } = renderWithProviders(
        <ReviewCustomer reviewState={{ qualification: 4, comment: '' }} />
      )
      expect(flat(getByText('Good')).color).toBe(scale.label_active_color)
      expect(flat(getByText('Bad')).color).toBe(scale.label_color)
      expect(flat(getByText('Bad')).fontSize).toBe(scale.label.fontSize)
      expect(getByLabelText('Good').props.accessibilityState.selected).toBe(true)
      expect(getByLabelText('Bad').props.accessibilityState.selected).toBe(false)
      expect(flat(getByLabelText('Bad')).minHeight).toBeGreaterThanOrEqual(44)
    })

    it('draws each level as the board does: 56 high, its label small (12) and semibold when chosen', () => {
      const { getByText, getByLabelText } = renderWithProviders(
        <ReviewCustomer reviewState={{ qualification: 4, comment: '' }} />
      )
      expect(scale.min_height).toBe(56)
      expect(flat(getByLabelText('Bad')).minHeight).toBe(scale.min_height)
      expect(scale.label.fontSize).toBe(theme.native.tokens.typography.body_sm.fontSize)
      // The chosen label takes the semibold file, the others keep the label's own.
      expect(flat(getByText('Good')).fontFamily).toBe(theme.native.tokens.typography.label.fontFamily)
      expect(flat(getByText('Bad')).fontFamily).toBe(theme.native.tokens.typography.body_sm.fontFamily)
    })

    it('follows a theme that changes the scale', () => {
      const custom = themeWith({ components: { rating_scale: { base: { fill: '#AA0000', track: '#00AA00', height: 10 } } } })
      const screen = renderWithProviders(
        <ReviewCustomer reviewState={{ qualification: 2, comment: '' }} />,
        { themeOverrides: custom }
      )
      expect(segment(screen, 1)).toEqual(expect.objectContaining({ backgroundColor: '#AA0000', height: 10 }))
      expect(segment(screen, 2).backgroundColor).toBe('#AA0000')
      expect(segment(screen, 3).backgroundColor).toBe('#00AA00')
    })

    it('answers a tap on a level from its whole column, segment and label', () => {
      const setReviewState = jest.fn()
      const { getByLabelText } = renderWithProviders(<ReviewCustomer reviewState={{ qualification: 1, comment: '' }} setReviewState={setReviewState} />)
      fireEvent.press(getByLabelText('Good'))
      expect(setReviewState).toHaveBeenCalledWith(expect.objectContaining({ qualification: 4 }))
    })
  })

  describe('the bar', () => {
    it('says whose order it is under the title: "Order No. 1042", as the app writes an order number', () => {
      const { getByText } = renderWithProviders(<ReviewCustomer order={{ id: 1042, customer: { name: 'Ana', lastname: 'Torres', photo: null } }} />)
      expect(getByText('Review customer')).toBeTruthy()
      expect(getByText('Order No. 1042')).toBeTruthy()
    })

    it('has no subtitle without an order', () => {
      const { queryByText } = renderWithProviders(<ReviewCustomer order={undefined} />)
      expect(queryByText(/Order No\./)).toBeNull()
    })
  })

  describe('the heading of the quick comments', () => {
    it('starts where the others do: a served " Tell us more" has its leading space trimmed at the use', () => {
      const { useLanguage } = require('@components')
      const original = (useLanguage as jest.Mock).getMockImplementation()
      const [state] = useLanguage()
      const spaced = (key: string, fallback?: string) => key.endsWith('QUICK_COMMENT_TITLE_4') ? ` ${fallback}` : (fallback ?? key)
      ;(useLanguage as jest.Mock).mockImplementation(() => [state, spaced])
      try {
        const { getByText } = renderWithProviders(<ReviewCustomer reviewState={{ qualification: 4, comment: '' }} />)
        const heading = getByText(/Tell us more/)
        expect(JSON.stringify(heading.props.children)).toBe('"Tell us more"')
        expect(getByText('Do you want to add something?')).toBeTruthy()
      } finally {
        ;(useLanguage as jest.Mock).mockImplementation(original)
      }
    })

    it('has no leading space in the text the code falls back to', () => {
      const { getByText } = renderWithProviders(<ReviewCustomer reviewState={{ qualification: 4, comment: '' }} />)
      expect(JSON.stringify(getByText(/Tell us more/).props.children)).toBe('"Tell us more"')
    })
  })

  describe('the quick comments', () => {
    it('are chips of the theme', () => {
      const { getByText } = renderWithProviders(
        <ReviewCustomer reviewState={{ qualification: 1, comment: '' }} />
      )
      expect(flat(getByText('Poor communication')).color).toBe(theme.native.components.chip.base.color)
    })

    it('wrap over several lines, with no row that scrolls sideways', () => {
      const screen = renderWithProviders(<ReviewCustomer reviewState={{ qualification: 1, comment: '' }} />)
      const wrap = flat(screen.getByTestId('quick-comments'))
      expect(wrap.flexWrap).toBe('wrap')
      expect(wrap.flexDirection).toBe('row')
      expect(wrap.gap).toBe(theme.native.tokens.space.sm)
      expect(nodes(screen.toJSON()).filter((node) => node.type === 'RCTScrollView' && node.props.horizontal)).toHaveLength(0)
      expect(screen.getAllByTestId('quick-comments')).toHaveLength(1)
      ;['Poor communication', 'Rude'].forEach((chip) => {
        expect(within(screen.getByTestId('quick-comments')).getByLabelText(chip)).toBeTruthy()
      })
    })

    it('are the chips of the chosen level, and change with it', () => {
      const chips = (qualification: number) => {
        const screen = renderWithProviders(<ReviewCustomer reviewState={{ qualification, comment: '' }} />)
        const labels = within(screen.getByTestId('quick-comments')).getAllByRole('button').map((node: any) => node.props.accessibilityLabel)
        screen.unmount()
        return labels
      }
      expect(chips(1).length).toBeGreaterThan(5)
      expect(chips(1)).toContain('Rude')
      expect(chips(5)).not.toContain('Rude')
      expect(chips(5).length).toBeGreaterThan(0)
    })

    it('are selected and unselected by a press, and written into the comment', () => {
      const setReviewState = jest.fn()
      const { getByLabelText } = renderWithProviders(
        <ReviewCustomer reviewState={{ qualification: 1, comment: '' }} setReviewState={setReviewState} />
      )
      expect(getByLabelText('Rude').props.accessibilityState.selected).toBe(false)
      fireEvent.press(getByLabelText('Rude'))
      expect(getByLabelText('Rude').props.accessibilityState.selected).toBe(true)
      expect(setReviewState).toHaveBeenLastCalledWith(expect.objectContaining({ comment: 'Rude. ' }))
      fireEvent.press(getByLabelText('Rude'))
      expect(getByLabelText('Rude').props.accessibilityState.selected).toBe(false)
    })
  })

  it('writes the typed comment into the review', () => {
    const setReviewState = jest.fn()
    const { getByPlaceholderText } = renderWithProviders(<ReviewCustomer setReviewState={setReviewState} />)
    fireEvent.changeText(getByPlaceholderText('Comments'), 'Great customer')
    expect(setReviewState).toHaveBeenLastCalledWith(expect.objectContaining({ comment: 'Great customer' }))
  })

  it('leaves the Send bar its room under the scroll', () => {
    const { toJSON } = renderWithProviders(<ReviewCustomer />)
    const scroll = nodes(toJSON()).find((node) => node.type === 'RCTScrollView')
    expect(flat({ props: { style: scroll.props.contentContainerStyle } }).paddingBottom).toBe(bottomBarClearance(theme, 0, 1))
  })

  it('writes the question under the title as a lead: body_lg (decision H7)', () => {
    const { getByText } = renderWithProviders(<ReviewCustomer reviewState={{ qualification: 1, comment: '' }} />)
    const lead = flat(getByText(/How was your experience with/))
    expect(lead.fontSize).toBe(theme.native.tokens.typography.body_lg.fontSize)
    expect(lead.lineHeight).toBe(theme.native.tokens.typography.body_lg.lineHeight)
  })

  describe('the customer\'s block', () => {
    const review = { qualification: 1, comment: '' }

    it('puts `md` (15) between the customer\'s disc and the text, as the mockup does', () => {
      const screen = renderWithProviders(<ReviewCustomer reviewState={review} />)
      const row = nodes(screen.toJSON()).find((node) => node.children?.some?.((child: any) => child?.props?.testID === 'customer-avatar'))
      expect(flat(row).flexDirection).toBe('row')
      expect(flat(row).gap).toBe(theme.native.tokens.space.md)
    })

    it('the picture leads the title and the question', () => {
      const screen = renderWithProviders(<ReviewCustomer reviewState={review} />)
      expect(at(screen, 'customer-avatar')).toBeGreaterThanOrEqual(0)
      expect(at(screen, 'customer-avatar')).toBeLessThan(at(screen, 'Rate the experience'))
      expect(at(screen, 'customer-avatar')).toBeLessThan(at(screen, 'How was your experience with'))
    })

    it('draws a customer without a photo as the avatar\'s neutral disc (the border\'s grey, a muted person glyph), not its brand fill', () => {
      const screen = renderWithProviders(<ReviewCustomer reviewState={review} />)
      const { OAvatar, Icon } = require('../../shared')
      expect(screen.UNSAFE_getByType(OAvatar).props).toEqual(expect.objectContaining({ tone: 'neutral', size: 'lg' }))
      const disc = flat(screen.getByTestId('customer-avatar'))
      const size = theme.native.components.avatar.sizes.lg.size
      // The board draws the customer\'s disc 56 with a 26 glyph.
      expect(size).toBe(56)
      expect(theme.native.components.avatar.sizes.lg.icon_size).toBe(26)
      expect(disc).toEqual(expect.objectContaining({
        width: size,
        height: size,
        borderRadius: theme.native.components.avatar.base.radius,
        backgroundColor: theme.native.tokens.color.border
      }))
      expect(disc.backgroundColor).not.toBe(theme.native.components.avatar.base.background)
      const glyph = within(screen.getByTestId('customer-avatar')).UNSAFE_getByType(Icon)
      expect(glyph.props.name).toBe('person-outline')
      expect(glyph.props.color).toBe('text_muted')
      expect(glyph.props.size).toBe(theme.native.components.avatar.sizes.lg.icon_size)
    })

    it('draws the customer\'s photo when the order has one, and no placeholder', () => {
      const order = { id: 1, customer: { name: 'Ana', photo: 'https://example.com/ana.jpg' } }
      const screen = renderWithProviders(<ReviewCustomer reviewState={review} order={order} />)
      expect(screen.getAllByTestId('customer-avatar')).toHaveLength(1)
      expect(screen.UNSAFE_getByType(require('../../shared').OAvatar).props.tone).toBe('brand')
      expect(screen.UNSAFE_queryAllByType(require('../../shared').Icon).filter((icon: any) => icon.props.name === 'person-outline')).toHaveLength(0)
    })

    it('is one picture', () => {
      const screen = renderWithProviders(<ReviewCustomer reviewState={review} />)
      expect(screen.getAllByTestId('customer-avatar')).toHaveLength(1)
    })

    it('asks about the customer by name, all the name\'s parts in a row', () => {
      const order = { customer: { name: 'Ana', middle_name: 'M', lastname: 'Torres', second_lastname: 'Gil', photo: null } }
      const { getByText } = renderWithProviders(<ReviewCustomer reviewState={review} order={order} />)
      expect(getByText('How was your experience with Ana M Torres Gil?')).toBeTruthy()
    })

    it('writes the name the order has, with no gap for a part it lacks', () => {
      const { getByText } = renderWithProviders(<ReviewCustomer reviewState={review} />)
      expect(getByText('How was your experience with Jane Doe?')).toBeTruthy()
    })

    it('leaves the question out when the order has no customer name, and keeps the title', () => {
      const { queryByText, getByText } = renderWithProviders(<ReviewCustomer reviewState={review} order={{ customer: { photo: null } }} />)
      expect(queryByText(/How was your experience with/)).toBeNull()
      expect(getByText('Rate the experience')).toBeTruthy()
    })
  })

  describe('the Send bar and the errors', () => {
    it('sends a custom review with the chosen level and the comment when the page has one', () => {
      const handleCustomCustomerReview = jest.fn()
      const handleSendCustomerReview = jest.fn()
      const { getByText } = renderWithProviders(
        <ReviewCustomer
          reviewState={{ qualification: 4, comment: 'Kind' }}
          handleCustomCustomerReview={handleCustomCustomerReview}
          handleSendCustomerReview={handleSendCustomerReview}
        />
      )
      fireEvent.press(getByText('Send Review'))
      expect(handleCustomCustomerReview).toHaveBeenCalledWith({ qualification: 4, comment: 'Kind' })
      expect(handleSendCustomerReview).not.toHaveBeenCalled()
    })

    it('shows no alert while there is no error', () => {
      const { queryByTestId } = renderWithProviders(<ReviewCustomer />)
      expect(queryByTestId('alert-original')).toBeNull()
    })

    it('alerts with the error, and closes the alert when accepted', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProviders(
        <ReviewCustomer actionState={{ loading: false, error: ['Could not send'] }} />
      )
      expect(getByTestId('alert-original')).toBeTruthy()
      expect(getByText('Error')).toBeTruthy()
      expect(getByText('Could not send')).toBeTruthy()
      expect(getByTestId('alert-notice')).toBeTruthy()
      fireEvent.press(getByTestId('alert-accept'))
      expect(queryByTestId('alert-original')).toBeNull()
    })
  })

  describe('the sections of the page review', () => {
    it('shows the customer, the scale, the quick comments and the comment, in that order', () => {
      const { toJSON } = renderWithProviders(<ReviewCustomer reviewState={{ qualification: 1, comment: '' }} />)
      const text = JSON.stringify(toJSON())
      const at = ['Rate the experience', 'Terrible', 'What went wrong?', 'Do you want to add something?', 'Send Review']
        .map((piece) => text.indexOf(piece))
      expect(at.every((index) => index >= 0)).toBe(true)
      expect([...at].sort((a, b) => a - b)).toEqual(at)
    })

    it.each([
      ['customer', ['Rate the experience', /How was your experience with/]],
      ['quick_comments', ['What went wrong?', 'Rude']],
      ['comment', ['Do you want to add something?']]
    ])('hides the section %s, and only it', (key, pieces) => {
      const props = { reviewState: { qualification: 1, comment: '' } }
      const shown = renderWithProviders(<ReviewCustomer {...props} />)
      pieces.forEach((piece) => expect(shown.getByText(piece)).toBeTruthy())
      const lines = (tree: any) => nodes(tree).filter((node) =>
        node.children === null && flat(node)?.height === theme.native.components.divider.variants.band.line.borderWidth
      ).length

      const hidden = renderWithProviders(<ReviewCustomer {...props} />, { themeOverrides: without(key) })
      pieces.forEach((piece) => expect(hidden.queryByText(piece)).toBeNull())
      // The scale and the Send bar always stay.
      expect(hidden.getByText('Okay')).toBeTruthy()
      expect(hidden.getByText('Send Review')).toBeTruthy()
      // A hidden block takes its line with it (the customer's has none).
      expect(lines(hidden.toJSON())).toBe(key === 'customer' ? lines(shown.toJSON()) : lines(shown.toJSON()) - 1)
    })

    it('hides the comment field with its section', () => {
      const { queryByPlaceholderText } = renderWithProviders(<ReviewCustomer />, { themeOverrides: without('comment') })
      expect(queryByPlaceholderText('Comments')).toBeNull()
    })
  })
})
