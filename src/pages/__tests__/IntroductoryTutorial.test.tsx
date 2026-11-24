import React from 'react'
import { Image, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { StoreMethods } from '@ui'
import { renderPage } from '../../../jest/helpers/renderPage'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../theme/engine'

// The real primitives (pager, dots, buttons, texts) and a store that records what is saved.
jest.mock('@ui', () => ({
  ...require('../../../jest/helpers/sharedPrimitivesMock').sharedPrimitives(),
  StoreMethods: { _setStoreData: jest.fn() }
}))

import IntroductoryTutorial from '../IntroductoryTutorial'

const { _setStoreData } = StoreMethods

const SLIDES = ['slide_1', 'slide_2', 'slide_3', 'slide_4', 'slide_5']
const TITLES = ['New Order', 'Deliver it', 'Follow the route', 'Add more info', 'Complete the delivery']
const IMAGES = Object.fromEntries(SLIDES.map((key) => [`onboarding.${key}`, `https://cdn.test/${key}.jpg`]))

const themed = (values: Record<string, unknown> = {}): any =>
  buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { images: IMAGES, ...values } })
const onboarding = (sections: Array<[string, boolean]>) => ({
  onboarding: { sections: sections.map(([key, visible]) => ({ key, visible })) }
})

const renderTutorial = (theme?: any) => {
  const setTutorial = jest.fn()
  const view = renderPage(IntroductoryTutorial, {
    route: { params: { setTutorial } },
    ...(theme && { themeOverrides: theme })
  } as any)
  return { ...view, setTutorial }
}
const slideImages = (view: any) => view.UNSAFE_getAllByType(Image).map((image: any) => image.props.source?.uri)
const dotColors = (view: any) => [...view.getAllByTestId('pager-dot-active'), ...view.getAllByTestId('pager-dot')]
  .map((dot: any) => StyleSheet.flatten(dot.props.style).backgroundColor)

describe('IntroductoryTutorial', () => {
  it('sizes a slide\'s image box to the image, so the texts start right under it (never more than its share of the window)', () => {
    const { Dimensions } = require('react-native')
    const { width, height } = Dimensions.get('window')
    const view = renderTutorial(themed())
    const box = StyleSheet.flatten(view.getAllByTestId('tutorial-media')[0].props.style)
    const image = StyleSheet.flatten(view.UNSAFE_getAllByType(Image)[0].props.style)
    expect(image.height).toBe(Math.round(width * 1369 / 1242))
    expect(box.height).toBe(Math.min(height * 0.6634645, image.height))
    expect(box.height).toBeLessThanOrEqual(image.height)
  })

  it('renders the five slides in the app\'s pager, with their texts and the theme\'s images', () => {
    const view = renderTutorial(themed())
    TITLES.forEach((title) => expect(view.getByText(title)).toBeTruthy())
    expect(view.getByText('Alerts will come whenever you have a new order to deliver.')).toBeTruthy()
    expect(slideImages(view)).toEqual(SLIDES.map((key) => IMAGES[`onboarding.${key}`]))
    expect(view.getAllByTestId('pager-dot')).toHaveLength(4)
    expect(view.getAllByTestId('pager-dot-active')).toHaveLength(1)
  })

  it('paints the bundled slides while the theme sets no image', () => {
    const view = renderTutorial()
    expect(view.UNSAFE_getAllByType(Image)).toHaveLength(5)
    view.UNSAFE_getAllByType(Image).forEach((image: any) => expect(image.props.source).toBeTruthy())
  })

  it('goes on with Next and ends with Done, which saves that the tutorial was seen', () => {
    const view = renderTutorial()
    expect(view.queryByRole('button', { name: "Let's start!" })).toBeNull()
    for (let step = 0; step < 4; step++) {
      act(() => { fireEvent.press(view.getByRole('button', { name: 'Next' })) })
    }
    expect(view.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(_setStoreData).not.toHaveBeenCalled()

    fireEvent.press(view.getByRole('button', { name: "Let's start!" }))
    expect(_setStoreData).toHaveBeenCalledWith('isTutorial', false)
    expect(view.setTutorial).toHaveBeenCalledWith(false)
  })

  it('shows Skip on the first slide only; it goes to the last slide', () => {
    const view = renderTutorial()
    act(() => { fireEvent.press(view.getByRole('button', { name: 'Next' })) })
    expect(view.queryByRole('button', { name: 'Skip' })).toBeNull()

    const again = renderTutorial()
    act(() => { fireEvent.press(again.getByRole('button', { name: 'Skip' })) })
    expect(again.getByRole('button', { name: "Let's start!" })).toBeTruthy()
    expect(again.queryByRole('button', { name: 'Skip' })).toBeNull()
    expect(again.setTutorial).not.toHaveBeenCalled()
  })

  it('draws Skip with `md` at its sides (the boards\' 15) and Next with the button\'s own', () => {
    const view = renderTutorial()
    const box = (name: string) => StyleSheet.flatten(view.getByRole('button', { name }).children[0].props.style)
    expect(box('Skip').paddingHorizontal).toBe(defaultAppTheme().native.tokens.space.md)
    expect(box('Next').paddingHorizontal).toBe(defaultAppTheme().native.components.button.sizes.md.padding_x)
  })

  it('hides Skip with onboarding.skip, and nothing else', () => {
    const view = renderTutorial(themed({ visibility: { 'onboarding.skip': false } }))
    expect(view.queryByRole('button', { name: 'Skip' })).toBeNull()
    expect(view.getByRole('button', { name: 'Next' })).toBeTruthy()
    expect(view.getAllByTestId('pager-dot')).toHaveLength(4)
    expect(view.getByText('New Order')).toBeTruthy()
  })

  it('shows the slides the theme shows, in its order', () => {
    const view = renderTutorial(themed({
      pages: onboarding([['slide_3', true], ['slide_1', false], ['slide_5', true], ['slide_2', true], ['slide_4', false]])
    }))
    expect(slideImages(view)).toEqual(['slide_3', 'slide_5', 'slide_2'].map((key) => IMAGES[`onboarding.${key}`]))
    expect(view.queryByText('New Order')).toBeNull()
    expect(view.queryByText('Add more info')).toBeNull()
    expect(view.getAllByTestId('pager-dot')).toHaveLength(2)
  })

  it('ends at once, as when it is done, when the theme shows no slide', () => {
    const view = renderTutorial(themed({ pages: onboarding(SLIDES.map((key) => [key, false] as [string, boolean])) }))
    expect(view.setTutorial).toHaveBeenCalledWith(false)
    expect(_setStoreData).toHaveBeenCalledWith('isTutorial', false)
    expect(view.UNSAFE_queryAllByType(Image)).toHaveLength(0)
    expect(view.queryByRole('button')).toBeNull()
  })

  it('has a single slide end with Done, without Skip, Next or dots', () => {
    const view = renderTutorial(themed({ pages: onboarding([['slide_2', true], ['slide_1', false], ['slide_3', false], ['slide_4', false], ['slide_5', false]]) }))
    expect(view.getByRole('button', { name: "Let's start!" })).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Skip' })).toBeNull()
    expect(view.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(view.queryByTestId('pager-dot-active')).toBeNull()
  })

  it('draws the title, the dots and the actions from the tutorial of the theme', () => {
    const theme = themed({
      components: {
        tutorial: {
          base: { title_color: '#123456', dot_color: '#AAAAAA', dot_active_color: '#BBBBBB' },
          slots: { action: { color: 'danger', appearance: 'solid' }, skip: { color: 'danger', appearance: 'ghost' } }
        }
      }
    })
    const view = renderTutorial(theme)
    const title = StyleSheet.flatten(view.getByText('New Order').props.style)
    expect(title).toMatchObject({ color: '#123456', fontSize: theme.native.components.tutorial.base.title.fontSize })
    expect(dotColors(view)).toEqual(['#BBBBBB', '#AAAAAA', '#AAAAAA', '#AAAAAA', '#AAAAAA'])
    const solid = theme.native.components.button.variants.danger.solid
    expect(StyleSheet.flatten(view.getByText('Next').props.style).color).toBe(solid.color)
    // Skip is the `skip` slot's look, not the action's.
    expect(StyleSheet.flatten(view.getByText('Skip').props.style).color).toBe(theme.native.components.button.variants.danger.ghost.color)
  })

  describe('Next and Done are solid, Skip is ghost', () => {
    const box = (view: any, name: string) => StyleSheet.flatten(view.getByRole('button', { name }).children[0].props.style)
    // The slots' look the theme serves (the schema's defaults: a solid primary action and a ghost primary skip).
    const solidSlot = () => themed({ components: { tutorial: { slots: { action: { appearance: 'solid', color: 'primary' } } } } })

    it('paints Next and Done with the action slot\'s solid look, and Skip without a fill', () => {
      const theme = solidSlot()
      const solid = theme.native.components.button.variants.primary.solid
      const ghost = theme.native.components.button.variants.primary.ghost
      const view = renderTutorial(theme)
      expect(box(view, 'Next').backgroundColor).toBe(solid.background)
      expect(box(view, 'Skip').backgroundColor).toBe(ghost.background)
      expect(box(view, 'Skip').backgroundColor).not.toBe(solid.background)
      expect(StyleSheet.flatten(view.getByText('Skip').props.style).color).toBe(ghost.color)
      act(() => { fireEvent.press(view.getByRole('button', { name: 'Skip' })) })
      expect(box(view, "Let's start!").backgroundColor).toBe(solid.background)
    })

    it('paints Skip with its own slot, whatever look the action slot has', () => {
      const theme = themed({ components: { tutorial: { slots: { action: { appearance: 'outline' } } } } })
      const view = renderTutorial(theme)
      expect(box(view, 'Skip').backgroundColor).toBe(theme.native.components.button.variants.primary.ghost.background)
      expect(box(view, 'Next').borderColor).toBe(theme.native.components.button.variants.primary.outline.border.borderColor)
    })

    it('reads the Skip slot: another look there changes Skip and nothing else', () => {
      const theme = themed({ components: { tutorial: { slots: { skip: { appearance: 'outline', color: 'danger' } } } } })
      const view = renderTutorial(theme)
      expect(box(view, 'Skip').borderColor).toBe(theme.native.components.button.variants.danger.outline.border.borderColor)
      expect(box(view, 'Next').backgroundColor).toBe(theme.native.components.button.variants.primary.solid.background)
    })
  })

  it('writes the slide\'s text as a muted lead (`body_lg`), under its title', () => {
    const { typography, color } = defaultAppTheme().native.tokens
    const view = renderTutorial(themed())
    const lead = StyleSheet.flatten(view.getByText('Alerts will come whenever you have a new order to deliver.').props.style)
    expect(lead.fontSize).toBe(typography.body_lg.fontSize)
    expect(lead.color).toBe(color.text_muted)
  })

  it('draws the dot of the slide being seen longer than the others, in the dots\' height', () => {
    const { space } = defaultAppTheme().native.tokens
    const view = renderTutorial(themed())
    const active = StyleSheet.flatten(view.getByTestId('pager-dot-active').props.style)
    const idle = StyleSheet.flatten(view.getAllByTestId('pager-dot')[0].props.style)
    expect(active.width).toBe(space.lg)
    expect(idle.width).toBe(space.sm)
    expect(active.height).toBe(idle.height)
  })

  it('gives its actions the height of the action slot (a 44 pt target by default)', () => {
    const theme: any = defaultAppTheme()
    const slot = theme.native.components.tutorial.slots.action
    expect(theme.native.components.button.sizes[slot.size].height).toBeGreaterThanOrEqual(44)
    const view = renderTutorial()
    const heights = view.getByRole('button', { name: 'Next' })
      .findAll((node: any) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.minHeight !== undefined)
      .map((node: any) => StyleSheet.flatten(node.props.style).minHeight)
    expect(heights[0]).toBe(theme.native.components.button.sizes[slot.size].height)
  })

  it('puts Next\'s arrow after its text, by the button\'s own order and not a reversed row', () => {
    const view = renderTutorial()
    const box = view.getByRole('button', { name: 'Next' })
      .findAll((node: any) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.minHeight !== undefined)[0]
    expect(StyleSheet.flatten(box.props.style).flexDirection).toBe('row')
    // The label comes first, the arrow after it.
    const texts = box.findAll((node: any) => node.type === 'Text').map((node: any) => node.props.children)
    expect(texts[0]).toBe('Next')
    const children = React.Children.toArray(box.props.children).filter(Boolean) as any[]
    expect(children).toHaveLength(2)
    expect(children[1].props.name).toBe('arrow-forward')
  })
})
