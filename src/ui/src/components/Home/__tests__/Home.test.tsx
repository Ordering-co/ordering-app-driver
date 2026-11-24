import React from 'react'
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useApi } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { layoutWindowOf, onAndroid } from '../../../../../../jest/helpers/androidWindow'
import { languageSelectorDefaults } from '../../../../../../jest/helpers/d1ShellDefaults'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../../src/theme/engine'

// The language selector is the profile's own controller: its mock answers with the project's languages.
jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, languageSelectorDefaults: defaults } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return { ...mockOrdering, LanguageSelector: renderUiController(defaults) }
})

import { Home } from '..'


const IMAGES = { logotype: 'https://cdn.test/logotype.png', home_hero: 'https://cdn.test/hero.jpg' }
const themed = (values: Record<string, unknown> = {}): any =>
  buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { images: IMAGES, ...values } })
const homeSections = (hidden: string[]) => ({
  home: { sections: ['logo', 'title', 'login_account'].map((key) => ({ key, visible: !hidden.includes(key) })) }
})
const imageUris = (view: any) => view.UNSAFE_getAllByType(Image).map((image: any) => image.props.source?.uri)

const ONE_LANGUAGE = { loading: false, languages: [{ code: 'en', name: 'English' }] }

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useApi as jest.Mock).mockReturnValue([
      { project: 'demo' },
      { setOrdering: jest.fn() }
    ])
  })

  it('renders welcome copy and navigates to login', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <Home
        onNavigationRedirect={onNavigationRedirect}
        useRootPoint={false}
       
      />
    )
    expect(getByText('Your deliveries, in one place')).toBeTruthy()
    expect(getByText('Sign in to see your orders')).toBeTruthy()
    fireEvent.press(getByText('Login'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('Login')
  })

  it('shows project input when useRootPoint is enabled', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <Home
        useRootPoint
        onNavigationRedirect={jest.fn()}
       
      />
    )
    expect(getByLabelText('Project Name')).toBeTruthy()
    expect(getByText('Set project')).toBeTruthy()
  })

  it('names the project field with a label over it, in the hero\'s ink (it is read over the photo)', () => {
    const theme = themed({ components: { home_hero: { base: { title_color: '#ABCDEF' } } } })
    const { getByText, queryByPlaceholderText } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={jest.fn()} />,
      { themeOverrides: theme }
    )
    expect(queryByPlaceholderText('Project Name')).toBeNull()
    expect(StyleSheet.flatten(getByText('Project Name').props.style).color).toBe('#ABCDEF')
  })

  it('has no project field without use_root_point, and its button reads "Login"', () => {
    const { queryByLabelText, getByRole, queryByText } = renderWithProviders(
      <Home useRootPoint={false} onNavigationRedirect={jest.fn()} />
    )
    expect(queryByLabelText('Project Name')).toBeNull()
    expect(queryByText('Set project')).toBeNull()
    expect(getByRole('button', { name: 'Login' })).toBeTruthy()
  })

  it('submits project name and redirects after ordering updates', async () => {
    const onNavigationRedirect = jest.fn()
    let apiState = { project: null as string | null }
    const setOrdering = jest.fn((next) => {
      apiState = next
    })
    ;(useApi as jest.Mock).mockImplementation(() => [apiState, { setOrdering }])

    const { getByLabelText, getByText, rerender } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={onNavigationRedirect} />
    )

    await act(async () => {
      fireEvent.changeText(getByLabelText('Project Name'), 'my project')
      fireEvent.press(getByText('Set project'))
    })

    await waitFor(() => {
      expect(setOrdering).toHaveBeenCalledWith(expect.objectContaining({ project: 'myproject' }))
    })

    apiState = { project: 'myproject' }
    ;(useApi as jest.Mock).mockImplementation(() => [apiState, { setOrdering }])
    rerender(<Home useRootPoint onNavigationRedirect={onNavigationRedirect} />)

    await waitFor(() => {
      expect(onNavigationRedirect).toHaveBeenCalledWith('Login')
    })
  })

  it('shows validation error when project name is empty', async () => {
    const { getByText } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={jest.fn()} />
    )
    fireEvent.press(getByText('Set project'))
    await waitFor(() => {
      expect(getByText('The field project name is required')).toBeTruthy()
    })
  })

  it('writes that error as the app\'s field error, at the start under its field, in the hero\'s ink (decision H7)', async () => {
    const theme = themed({ components: { home_hero: { base: { title_color: '#ABCDEF', title_align: 'center' } } } })
    const field = theme.native.components.field.base
    const { getByText, findByTestId, queryByTestId, getByLabelText } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={jest.fn()} />,
      { themeOverrides: theme }
    )
    expect(queryByTestId('home-project-error')).toBeNull()
    fireEvent.press(getByText('Set project'))
    const error = await findByTestId('home-project-error')
    const style = StyleSheet.flatten(error.props.style)
    expect(style.fontSize).toBe(field.error.fontSize)
    expect(style.marginTop).toBe(field.message_gap)
    // Over the photo it takes the hero's ink, and it starts with its field even in a centered hero.
    expect(style.color).toBe('#ABCDEF')
    expect(style.textAlign).toBe('auto')
    // It sits with its field, over the button: the message's gap from the field, not the form's.
    let group: any = error.parent
    while (group && !group.findAllByProps({ accessibilityLabel: 'Project Name' }).length) group = group.parent
    expect(getByLabelText('Project Name')).toBeTruthy()
    expect(group.findAllByProps({ accessibilityRole: 'button' })).toHaveLength(0)
  })

  describe('the language', () => {
    const renderHome = (theme: any = themed(), props: Record<string, unknown> = {}) => renderWithProviders(
      <Home onNavigationRedirect={jest.fn()} useRootPoint={false} {...props} />,
      { themeOverrides: theme }
    )
    const original = languageSelectorDefaults.languagesState
    afterEach(() => {
      languageSelectorDefaults.languagesState = original
    })

    it('shows a button with the current language when the project has more than one', () => {
      const { getByTestId, getByText } = renderHome()
      const button = getByTestId('language-selector')
      expect(button).toBeTruthy()
      expect(getByText('English')).toBeTruthy()
      expect(getByTestId('language-selector').props.accessibilityLabel).toBe('Language: English')
    })

    it('shows nothing, and takes no room, when the project has only one', () => {
      languageSelectorDefaults.languagesState = ONE_LANGUAGE
      const { queryByTestId, queryByText } = renderHome()
      expect(queryByTestId('language-selector')).toBeNull()
      expect(queryByText('English')).toBeNull()
      // The logo's bar is still there, with the logo alone.
      expect(imageUris(renderHome())).toContain(IMAGES.logotype)
    })

    it('shows nothing while the languages load', () => {
      languageSelectorDefaults.languagesState = { loading: true, languages: original.languages }
      expect(renderHome().queryByTestId('language-selector')).toBeNull()
    })

    it('changes the language as the profile\'s row does: the same sheet, the same controller call', () => {
      const { getByTestId, getByText, queryByText } = renderHome()
      expect(queryByText('Español')).toBeNull()
      fireEvent.press(getByTestId('language-selector'))
      fireEvent.press(getByText('Español'))
      expect(languageSelectorDefaults.handleChangeLanguage).toHaveBeenCalledWith('es')
      // Choosing closes the sheet.
      expect(queryByText('Español')).toBeNull()
    })

    it('sits at the end of the logo\'s bar, in the theme\'s order of the sections', () => {
      const { toJSON } = renderHome()
      const text = JSON.stringify(toJSON())
      expect(text.indexOf(IMAGES.logotype)).toBeLessThan(text.indexOf('language-selector'))
      expect(text.indexOf('language-selector')).toBeLessThan(text.indexOf('Your deliveries, in one place'))
    })

    it('keeps the top of the screen when the theme hides the logo', () => {
      const view = renderHome(themed({ pages: homeSections(['logo']) }))
      expect(imageUris(view)).not.toContain(IMAGES.logotype)
      expect(view.getByTestId('language-selector')).toBeTruthy()
      const text = JSON.stringify(view.toJSON())
      expect(text.indexOf('language-selector')).toBeLessThan(text.indexOf('Your deliveries, in one place'))
    })

    it('takes no room for the bar of a hidden logo when there is one language', () => {
      languageSelectorDefaults.languagesState = ONE_LANGUAGE
      const view = renderHome(themed({ pages: homeSections(['logo']) }))
      expect(view.queryByTestId('language-selector')).toBeNull()
      expect(JSON.stringify(view.toJSON())).toContain('"display":"none"')
    })
  })

  it('lifts the whole screen above the keyboard (the button and the project field stay in sight)', () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={jest.fn()} />
    )
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.enabled).toBe(true)
  })

  it('on Android gives the avoiding view the distance of the screen from the window\'s top (0 while it draws under the bars)', async () => {
    const android = onAndroid(0)
    const { UNSAFE_getByType } = renderWithProviders(
      <Home useRootPoint onNavigationRedirect={jest.fn()} />
    )
    await layoutWindowOf(UNSAFE_getByType(KeyboardAvoidingView))
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(0)
    android.restore()
  })

  describe('the room under the button, over the system\'s bottom inset', () => {
    const { useSafeAreaInsets } = require('react-native-safe-area-context')
    const pageSpace = defaultAppTheme().native.components.account_page.base.padding_bottom
    const space = defaultAppTheme().native.tokens.space
    const bottomOf = () => {
      const view = renderWithProviders(<Home onNavigationRedirect={jest.fn()} useRootPoint={false} />)
      return StyleSheet.flatten(view.UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingBottom
    }
    const originalOS = Platform.OS
    afterEach(() => {
      useSafeAreaInsets().bottom = 0
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS })
    })
    const onPlatform = (os: string, inset: number) => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os })
      useSafeAreaInsets().bottom = inset
    }

    it('on Android the button stands the page\'s bottom space (the one every other screen\'s last element has) above the navigation bar', () => {
      onPlatform('android', 48)
      expect(pageSpace).toBeGreaterThan(0)
      expect(bottomOf()).toBe(pageSpace + 48)
      onPlatform('android', 0)
      expect(bottomOf()).toBe(pageSpace)
    })

    it('on iOS it stays as it was: the larger of the home indicator\'s inset and `lg`', () => {
      onPlatform('ios', 34)
      expect(bottomOf()).toBe(Math.max(34, space.lg))
      onPlatform('ios', 0)
      expect(bottomOf()).toBe(space.lg)
    })
  })

  describe('theme', () => {
    const renderHome = (theme: any, props: Record<string, unknown> = {}) => renderWithProviders(
      <Home onNavigationRedirect={jest.fn()} useRootPoint={false} {...props} />,
      { themeOverrides: theme }
    )

    it('paints the theme\'s hero photo and logotype', () => {
      const view = renderHome(themed())
      expect(imageUris(view)).toEqual(expect.arrayContaining([IMAGES.home_hero, IMAGES.logotype]))
    })

    it('hides the logo section and keeps the rest', () => {
      const view = renderHome(themed({ pages: homeSections(['logo']) }))
      expect(imageUris(view)).not.toContain(IMAGES.logotype)
      expect(imageUris(view)).toContain(IMAGES.home_hero)
      expect(view.getByText('Your deliveries, in one place')).toBeTruthy()
      expect(view.getByRole('button', { name: 'Login' })).toBeTruthy()
    })

    it('hides the title section (title and text) and keeps the rest', () => {
      const view = renderHome(themed({ pages: homeSections(['title']) }))
      expect(view.queryByText('Your deliveries, in one place')).toBeNull()
      expect(view.queryByText('Sign in to see your orders')).toBeNull()
      expect(imageUris(view)).toContain(IMAGES.logotype)
      expect(view.getByRole('button', { name: 'Login' })).toBeTruthy()
    })

    it('keeps the login block at the bottom when the title is hidden', () => {
      const shown = renderHome(themed())
      const login = (view: any) => StyleSheet.flatten(view.getByTestId('home-login-account').props.style)
      expect(login(shown).marginTop).toBeUndefined()
      const hidden = renderHome(themed({ pages: homeSections(['title']) }))
      expect(login(hidden).marginTop).toBe('auto')
    })

    it('renders the sections in the theme\'s order', () => {
      const theme = themed({
        pages: { home: { sections: [{ key: 'title', visible: true }, { key: 'logo', visible: true }, { key: 'login_account', visible: true }] } }
      })
      const { toJSON } = renderHome(theme)
      const text = JSON.stringify(toJSON())
      expect(text.indexOf('Your deliveries, in one place')).toBeLessThan(text.indexOf(IMAGES.logotype))
      expect(text.indexOf(IMAGES.logotype)).toBeLessThan(text.indexOf('"Login"'))
    })

    it('draws the title, the overlay and the button from the home hero', () => {
      const theme = themed({
        components: {
          home_hero: {
            base: { title_color: '#ABCDEF', title_align: 'end', overlay: '#10203040', padding_x: 30 },
            slots: { login: { color: 'success' } }
          }
        }
      })
      const view = renderHome(theme)
      const titleStyle = StyleSheet.flatten(view.getByText('Your deliveries, in one place').props.style)
      expect(titleStyle).toMatchObject({ color: '#ABCDEF', textAlign: 'right', fontSize: theme.native.components.home_hero.base.title.fontSize })
      expect(StyleSheet.flatten(view.getByText('Sign in to see your orders').props.style).color).toBe('#ABCDEF')
      expect(StyleSheet.flatten(view.getByText('Login').props.style).color).toBe(theme.native.components.button.variants.success.solid.color)
      expect(JSON.stringify(view.toJSON())).toContain(theme.native.components.home_hero.base.overlay)
      expect(JSON.stringify(view.toJSON())).toContain('"paddingHorizontal":30')
    })

    it('draws the main button 50 high (the `lg` size of its slot) and the title 28 / 700, as the mockup', () => {
      const theme = themed()
      const view = renderHome(theme)
      const button = StyleSheet.flatten(view.getByRole('button', { name: 'Login' }).children[0].props.style)
      expect(theme.native.components.home_hero.slots.login.size).toBe('lg')
      expect(button.minHeight).toBe(theme.native.components.button.sizes.lg.height)
      expect(button.minHeight).toBe(50)
      expect(StyleSheet.flatten(view.getByText('Your deliveries, in one place').props.style)).toMatchObject({ fontSize: 28 })
    })

    it('marks the project field with the input error state', async () => {
      const theme = themed()
      const error = theme.native.components.input.variants.default.states.error
      const view = renderHome(theme, { useRootPoint: true })
      fireEvent.press(view.getByRole('button', { name: 'Set project' }))
      await waitFor(() => expect(view.getByText('The field project name is required')).toBeTruthy())
      const box = StyleSheet.flatten(view.getByLabelText('Project Name').parent?.parent?.props.style ?? {})
      expect(box.borderColor).toBe(error.border.borderColor)
    })
  })
})
