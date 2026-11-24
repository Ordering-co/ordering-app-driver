import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Alert, Image, ScrollView, StyleSheet } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'

import { useSession, useUtils } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { nativeBoxStyle } from '../../../../../theme/helpers'

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { sessionsDefaults } = require('../../../../../../jest/helpers/d2AuthDefaults')
  return {
    ...mockOrdering,
    Sessions: renderUiController(sessionsDefaults),
    // The bottom bar's controller: it hands its props to the UI (`FloatingButton`).
    FloatingButton: renderUiController({})
  }
})

import { Sessions } from '..'

describe('Sessions', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        user: { id: 1, session_strategy: 'jwt_session' }
      },
      { logout: jest.fn() }
    ])
    ;(useUtils as jest.Mock).mockReturnValue([{ parseDate: (value: string) => value }])
  })

  it('renders session list for jwt users', () => {
    const { getByText } = renderWithProviders(<Sessions />)
    expect(getByText('Delete all sessions except current')).toBeTruthy()
  })

  it('opens delete-all confirmation dialog', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(
      <Sessions handleDeleteAllSessions={handleDeleteAllSessions} />
    )
    fireEvent.press(getByText('Delete all sessions except current'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteAllSessions).toHaveBeenCalledWith(false)
    alertSpy.mockRestore()
  })

  it('opens delete-all-sessions confirmation (including current)', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(
      <Sessions handleDeleteAllSessions={handleDeleteAllSessions} />
    )
    fireEvent.press(getByText('Delete all sessions'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteAllSessions).toHaveBeenCalledWith(true)
    alertSpy.mockRestore()
  })

  it('shows enable sessions prompt for non-jwt users', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, user: { id: 1, session_strategy: 'cookie' } },
      { logout: jest.fn() }
    ])
    const { getByText } = renderWithProviders(<Sessions />)
    expect(getByText('Active sessions')).toBeTruthy()
  })

  it('enables sessions for non-jwt users', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, user: { id: 1, session_strategy: 'cookie' } },
      { logout: jest.fn() }
    ])
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(
      <Sessions handleDeleteAllSessions={handleDeleteAllSessions} />
    )
    fireEvent.press(getByText('Active sessions'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteAllSessions).toHaveBeenCalledWith(false)
    alertSpy.mockRestore()
  })

  it('renders loading placeholders', () => {
    const { getAllByTestId, queryByText } = renderWithProviders(
      <Sessions sessionsList={{ loading: true, sessions: [] }} />
    )
    expect(getAllByTestId('session-skeleton')).toHaveLength(5)
    expect(queryByText('Delete all sessions')).toBeNull()
  })

  it('lays the skeleton and the list inside the page gutter, in the account page\'s room below and `md` apart', () => {
    const custom = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: {
        tokens: { layout: { page_gutter: 30 } },
        components: { account_page: { base: { padding_bottom: 50 } } }
      }
    })
    const { UNSAFE_getByType, getAllByTestId } = renderWithProviders(
      <Sessions sessionsList={{ loading: true, sessions: [] }} />,
      { themeOverrides: custom }
    )
    const scroll = UNSAFE_getByType(ScrollView)
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle)
    expect(content.paddingHorizontal).toBe(30)
    // The room above is the header's `xs` (decision H8), not the account page's `padding_top`.
    expect(content.paddingTop).toBeUndefined()
    // Over the system's bottom inset (0 in the tests).
    expect(content.paddingBottom).toBe(50)
    // The cards are `md` apart, as the cards of every list.
    expect(content.gap).toBe(custom.native.tokens.space.md)
    // The skeleton cards are the scroll's content: they sit on the same gutter as the loaded cards.
    expect(within(scroll).getAllByTestId('session-skeleton')).toHaveLength(getAllByTestId('session-skeleton').length)
  })

  it('writes when each session started and until when it is valid, each with its caption', () => {
    const { getAllByTestId } = renderWithProviders(<Sessions />)
    // The list shows the newest first.
    const [first, second] = getAllByTestId('session-card')
    expect(within(first).getByText('Started 2026-02-01')).toBeTruthy()
    expect(within(first).getByText('Valid until 2026-12-31')).toBeTruthy()
    expect(within(second).getByText('Started 2026-01-01')).toBeTruthy()
    expect(within(second).getByText('Valid until 2026-12-31')).toBeTruthy()
  })

  it('draws the caption in the metadata\'s color inside the date, which is plain text (a list row\'s title, regular: the boards\' 400)', () => {
    const { order_card: card, list_row: row } = defaultAppTheme().native.components
    const { getAllByText } = renderWithProviders(<Sessions />)
    const [caption] = getAllByText('Started')
    expect(StyleSheet.flatten(caption.props.style).color).toBe(card.base.meta_color)
    expect(StyleSheet.flatten(caption.props.style).fontFamily).toBe(row.base.title.fontFamily)
    let line: any = caption.parent
    while (line && line.type !== 'Text') line = line.parent
    expect(StyleSheet.flatten(line.props.style).color).toBe(row.base.title_color)
    expect(StyleSheet.flatten(line.props.style).fontSize).toBe(row.base.title.fontSize)
    // Not the card title's semibold.
    expect(StyleSheet.flatten(line.props.style).fontFamily).toBe(row.base.title.fontFamily)
    expect(StyleSheet.flatten(line.props.style).fontFamily).not.toBe(card.base.name.fontFamily)
  })

  it('puts the two bulk actions in the app\'s bottom bar, both danger: the one that keeps the current session solid, over "delete all" in outline', () => {
    const variants = defaultAppTheme().native.components.button.variants.danger
    const { getByTestId, getByRole } = renderWithProviders(<Sessions />)
    const bar = getByTestId('sessions-bar')
    const labels = within(bar).getAllByRole('button').map((node: any) => within(node).getByText(/^Delete all/).props.children)
    expect(labels).toEqual(['Delete all sessions except current', 'Delete all sessions'])
    const box = (name: string) => StyleSheet.flatten(getByRole('button', { name }).children[0].props.style)
    expect(box('Delete all sessions except current')).toEqual(expect.objectContaining(nativeBoxStyle(variants.solid)))
    expect(box('Delete all sessions')).toEqual(expect.objectContaining(nativeBoxStyle(variants.outline)))
    expect(box('Delete all sessions').backgroundColor).not.toBe(box('Delete all sessions except current').backgroundColor)
    // The label of the outline one is the danger text on the page, as the theme's outline button.
    expect(StyleSheet.flatten(within(getByRole('button', { name: 'Delete all sessions' })).getByText('Delete all sessions').props.style).color).toBe(variants.outline.color)
  })

  it('has no bar while the sessions load, when there are none and when they are turned off', () => {
    const loading = renderWithProviders(<Sessions sessionsList={{ loading: true, sessions: [] }} />)
    expect(loading.queryByTestId('sessions-bar')).toBeNull()
    loading.unmount()
    const empty = renderWithProviders(<Sessions sessionsList={{ loading: false, sessions: [] }} />)
    expect(empty.queryByTestId('sessions-bar')).toBeNull()
    empty.unmount()
    ;(useSession as jest.Mock).mockReturnValue([{ auth: true, user: { id: 1, session_strategy: 'cookie' } }, { logout: jest.fn() }])
    const off = renderWithProviders(<Sessions />)
    expect(off.queryByTestId('sessions-bar')).toBeNull()
  })

  it('cannot start a bulk action while one runs', () => {
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(<Sessions actionState={{ loading: true }} handleDeleteAllSessions={handleDeleteAllSessions} />)
    fireEvent.press(getByText('Delete all sessions'))
    fireEvent.press(getByText('Delete all sessions except current'))
    expect(handleDeleteAllSessions).not.toHaveBeenCalled()
  })

  it('draws each session as a card of the theme, the current one with a success badge', () => {
    const theme = defaultAppTheme()
    const { getAllByTestId, getByText } = renderWithProviders(<Sessions />)
    const cards = getAllByTestId('session-card')
    expect(cards).toHaveLength(2)
    const card = StyleSheet.flatten(cards[0].props.style)
    expect(card.borderRadius).toBe(theme.native.components.card.base.radius)
    expect(card.padding).toBe(theme.native.components.card.base.padding)
    const badge = getByText('Current')
    expect(StyleSheet.flatten(badge.props.style).color).toBe(theme.native.components.badge.variants.success.color)
  })

  it('puts the current badge over the dates of the current session only, and that session keeps its delete button', () => {
    const { getAllByTestId, getByText } = renderWithProviders(<Sessions />)
    const [current, other] = (() => {
      const cards = getAllByTestId('session-card')
      // The list shows the newest first: the second sample is the older, the current one.
      return [cards[1], cards[0]]
    })()
    expect(within(current).getByText('Current')).toBeTruthy()
    expect(within(other).queryByText('Current')).toBeNull()
    // The badge sits in the dates' column, above them.
    let column: any = getByText('Current').parent
    while (column && StyleSheet.flatten(column.props.style)?.flex !== 1) column = column.parent
    expect(StyleSheet.flatten(column.props.style).alignItems).toBe('flex-start')
    expect(within(column).getByText('Valid until 2026-12-31')).toBeTruthy()
    expect(within(current).getByLabelText('Delete')).toBeTruthy()
    expect(within(other).getByLabelText('Delete')).toBeTruthy()
  })

  it('deletes one session from its button, a 44 pt target, after the confirmation', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleDeleteSession = jest.fn()
    const { getAllByLabelText } = renderWithProviders(
      <Sessions handleDeleteSession={handleDeleteSession} />
    )
    const buttons = getAllByLabelText('Delete')
    expect(buttons).toHaveLength(2)
    const box = StyleSheet.flatten(buttons[0].children[0].props.style)
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    fireEvent.press(buttons[0])
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteSession).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(Number) }))
    alertSpy.mockRestore()
  })

  it('goes back from the navbar', () => {
    const navigation = { goBack: jest.fn(), canGoBack: jest.fn(() => true) }
    const { getByLabelText } = renderWithProviders(<Sessions navigation={navigation} />)
    fireEvent.press(getByLabelText('Go back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('shows empty sessions message', () => {
    const { getByText } = renderWithProviders(
      <Sessions sessionsList={{ loading: false, sessions: [] }} />
    )
    expect(getByText("You don't have any sessions")).toBeTruthy()
  })

  it('draws the empty list as the app\'s empty state: its icon and a muted lead, centered (decision H5)', () => {
    const theme: any = defaultAppTheme()
    const { getByText, getByTestId, UNSAFE_queryAllByType, queryByRole } = renderWithProviders(
      <Sessions sessionsList={{ loading: false, sessions: [] }} />
    )
    const message = StyleSheet.flatten(getByText("You don't have any sessions").props.style)
    expect(message.fontSize).toBe(theme.native.tokens.typography.body_lg.fontSize)
    expect(message.color).toBe(theme.native.tokens.color.text_muted)
    expect(message.textAlign).toBe('center')
    // No bundled picture: the empty state draws its icon.
    expect(getByTestId('not-found-icon')).toBeTruthy()
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0)
    expect(queryByRole('button', { name: 'Active sessions' })).toBeNull()
  })

  it('draws the sessions turned off as the empty state with its action, off while a request runs (decision H5)', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, user: { id: 1, session_strategy: 'cookie' } },
      { logout: jest.fn() }
    ])
    const theme: any = defaultAppTheme()
    const text = "You don't have enabled the sessions, please active them to have a better control of your sessions."
    const { getByText, getByRole, getByTestId, UNSAFE_queryAllByType, rerender } = renderWithProviders(<Sessions />)
    const message = StyleSheet.flatten(getByText(text).props.style)
    expect(message.fontSize).toBe(theme.native.tokens.typography.body_lg.fontSize)
    expect(message.color).toBe(theme.native.tokens.color.text_muted)
    expect(getByTestId('not-found-icon')).toBeTruthy()
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0)
    expect(getByRole('button', { name: 'Active sessions' }).props.accessibilityState.disabled).toBe(false)

    rerender(<Sessions actionState={{ loading: true }} />)
    expect(getByRole('button', { name: 'Active sessions' }).props.accessibilityState.disabled).toBe(true)
  })

  describe('every deletion asks first, its accept button named after the action', () => {
    const asked = (spy: jest.SpyInstance) => {
      const [, message, buttons] = spy.mock.calls.at(-1) as any[]
      return { message, accept: buttons[0], cancel: buttons[1] }
    }

    it.each([
      ['a session\'s own button', (screen: any) => fireEvent.press(screen.getAllByLabelText('Delete')[0]), 'Are you sure to delete this session?', 'handleDeleteSession', undefined],
      ['"Delete all sessions"', (screen: any) => fireEvent.press(screen.getByText('Delete all sessions')), 'Are you sure that you want to delete all sessions?', 'handleDeleteAllSessions', true],
      ['"Delete all sessions except current"', (screen: any) => fireEvent.press(screen.getByText('Delete all sessions except current')), 'Are you sure that you want to delete all sessions except current?', 'handleDeleteAllSessions', false]
    ])('%s: nothing is deleted until "Delete" is accepted, and cancelling deletes nothing', (_name, press, message, handler, argument) => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
      const handlers = { handleDeleteSession: jest.fn(), handleDeleteAllSessions: jest.fn() }
      const screen = renderWithProviders(<Sessions {...handlers} />)
      press(screen)
      expect(alertSpy).toHaveBeenCalledTimes(1)
      expect(asked(alertSpy).message).toBe(message)
      expect(asked(alertSpy).accept).toEqual(expect.objectContaining({ text: 'Delete', style: 'destructive' }))
      expect(asked(alertSpy).cancel.text).toBe('Cancel')
      expect(handlers.handleDeleteSession).not.toHaveBeenCalled()
      expect(handlers.handleDeleteAllSessions).not.toHaveBeenCalled()
      asked(alertSpy).cancel.onPress?.()
      expect(handlers.handleDeleteSession).not.toHaveBeenCalled()
      expect(handlers.handleDeleteAllSessions).not.toHaveBeenCalled()
      asked(alertSpy).accept.onPress()
      expect((handlers as any)[handler]).toHaveBeenCalledTimes(1)
      if (argument !== undefined) expect((handlers as any)[handler]).toHaveBeenCalledWith(argument)
      alertSpy.mockRestore()
    })

    it('turning the sessions on is not a deletion: its accept button is the action\'s name, not destructive', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
      ;(useSession as jest.Mock).mockReturnValue([
        { auth: true, user: { id: 1, session_strategy: 'cookie' } },
        { logout: jest.fn() }
      ])
      const handleDeleteAllSessions = jest.fn()
      const { getByText } = renderWithProviders(<Sessions handleDeleteAllSessions={handleDeleteAllSessions} />)
      fireEvent.press(getByText('Active sessions'))
      expect(asked(alertSpy).accept).toEqual({ text: 'Active sessions', onPress: expect.any(Function) })
      expect(handleDeleteAllSessions).not.toHaveBeenCalled()
      alertSpy.mockRestore()
    })
  })
})

