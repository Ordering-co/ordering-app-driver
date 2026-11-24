import { resolve } from '@orderingco/ordering-theme-engine'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../engine'
import SCHEMA from '../../../product.schema.json'

/**
 * The look the schema's defaults draw: the approved mockups' (flat, with lines; a corner of 8 on buttons and
 * fields, 10 on cards and badges, 15 on dialogs and sheets), and how Identity still moves it.
 */
const schema: any = SCHEMA
/** A theme as the API serves it: what the author set, resolved with the schema (Identity reaches the components). */
const themed = (values: Record<string, unknown>) => {
  const resolved: any = resolve(schema, values)
  return buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: resolved.values ?? resolved })
}
/** A shadow that paints nothing (the engine's `none` is an object of zeros). */
const isFlat = (shadow: any) => !shadow || (shadow.shadowOpacity === 0 && shadow.elevation === 0)

describe('the defaults draw the mockups', () => {
  const { components, tokens } = defaultAppTheme().native

  it('are flat: no shadow anywhere Identity reaches, and the lines instead', () => {
    for (const box of [components.card.base, components.order_card.base, components.input.base, components.choice.base, components.alert.base, components.toast.base, components.modal.base, components.sheet.base, components.bottom_nav.base, components.bottom_bar.base, components.chat_bubble.base]) {
      expect(isFlat(box.shadow)).toBe(true)
    }
    expect(isFlat(components.button.variants.primary.solid.shadow)).toBe(true)
    expect(isFlat(components.button.variants.primary.tonal.shadow)).toBe(true)
    expect(components.card.base.border).toMatchObject({ borderWidth: 1, borderColor: tokens.color.border })
    expect(components.input.base.border).toMatchObject({ borderWidth: 1, borderColor: tokens.color.border_strong })
    expect(components.chip.base.border).toMatchObject({ borderWidth: 1, borderColor: tokens.color.border_strong })
    // The track and the tabs, the bubbles and the avatars have no line in the mockups.
    expect(components.tabs.variants.pill.border).toEqual({ borderWidth: 0 })
    expect(components.avatar.base.border).toEqual({ borderWidth: 0 })
    expect(components.chat_bubble.base.border).toEqual({ borderWidth: 0 })
  })

  it('round buttons and fields to 8, cards, badges and notices to 10, dialogs and sheets to 15', () => {
    expect(components.button.base.radius).toBe(8)
    expect(components.button.shapes.icon.radius).toBe(8)
    expect(components.input.base.radius).toBe(8)
    expect(components.card.base.radius).toBe(10)
    expect(components.order_card.base.radius).toBe(10)
    expect(components.badge.base.radius).toBe(10)
    expect(components.alert.base.radius).toBe(10)
    expect(components.modal.base.radius).toBe(15)
    expect(components.sheet.base.radius).toBe(15)
    expect(components.button.shapes.round.radius).toBe(tokens.radius.full)
    // The pill tabs' track and its tabs are round.
    expect(components.tabs.variants.pill.radius).toBe(tokens.radius.full)
    expect(components.tabs.variants.pill.tab_radius).toBe(tokens.radius.full)
  })

  it('keep a shadow on what floats over the map', () => {
    expect(components.map_marker.base.shadow).toMatchObject({ elevation: expect.any(Number) })
    expect(components.map_marker.base.shadow.shadowOpacity).toBeGreaterThan(0)
  })

  it('size the pieces as the mockups do', () => {
    expect(components.home_hero.slots.login.size).toBe('lg')
    expect(components.tabs.variants.pill.inset).toBe(4)
    expect(components.tabs.sizes.md.height).toBe(44)
    expect(components.bottom_nav.base.icon_size).toBe(22)
    expect(components.bottom_nav.base.height).toBe(64)
    expect(components.new_order_alert.base.icon_box_size).toBe(56)
    expect(components.input.sizes.code.height).toBe(56)
    expect(components.chat_bubble.slots.unread.size).toBe('sm')
    expect(components.review_form.slots.chip.size).toBe('md')
    expect(components.list_row.base.icon_color).toBe(tokens.color.text_muted)
    expect(components.timer.base.height).toBe(tokens.size.sm)
    expect(components.timer.base.background).toBe(tokens.color.surface_alt)
  })

  it('draw the tutorial\'s Skip as its own ghost slot and the auth forms\' labels above their fields', () => {
    expect(components.tutorial.slots.action).toMatchObject({ appearance: 'solid', color: 'primary' })
    expect(components.tutorial.slots.skip).toMatchObject({ appearance: 'ghost', color: 'primary' })
    expect(components.auth_form.scope.field.base.label_position).toBe('above')
    expect(components.account_page.scope.field.base.label_position).toBe('above')
    // The scopes nothing reads (buttons, links, tabs) are not offered.
    expect(Object.keys(schema.components.auth_form.scope).filter((key) => !key.startsWith('$')).sort()).toEqual(['field', 'input', 'timer'])
  })

  it('give the profile its own small section titles without touching the shared one', () => {
    expect(components.account_page.base.title).toEqual(tokens.typography.label)
    expect(components.section_header.base.title).toEqual(tokens.typography.h4)
    expect(components.account_page.base.title.fontSize).toBeLessThan(components.section_header.base.title.fontSize)
  })
})

describe('the sizes round of 2026-11-19: the defaults draw the boards\' sizes', () => {
  const { components, tokens } = defaultAppTheme().native

  it('icons: 22 alone in a button, 18 beside a label and at the end of a row, a field or a detail, 24 on the back arrow', () => {
    expect(components.button.shapes.icon.icon_size).toBe(22)
    expect(components.button.sizes.md.icon_size).toBe(18)
    expect(components.list_row.base.trailing_icon_size).toBe(18)
    expect(components.input.base.trailing_icon_size).toBe(18)
    expect(components.order_details.base.detail_icon_size).toBe(18)
    expect(components.new_order_alert.base.icon_size).toBe(28)
    // The leading glyph of a row and a field\'s own stay on the scale.
    expect(components.list_row.base.icon_size).toBe(tokens.icon.md)
    expect(components.input.base.icon_size).toBe(tokens.icon.md)
    expect(tokens.icon.lg).toBe(24)
  })

  it('the order card\'s status band and chips read the badge: the soft tones and the three colours of the order types', () => {
    const variants = components.badge.variants
    expect(variants.primary_soft).toEqual(expect.objectContaining({ background: tokens.color.primary_subtle, color: tokens.color.primary_pressed }))
    // The tints are the tokens'; the text is a darker value of the same hue than the token's, so it reads 4.5:1 on its tint (`orderCardBand.test`).
    expect(variants.warning_soft).toEqual(expect.objectContaining({ background: tokens.color.warning_subtle, color: '#6B5300' }))
    expect(variants.danger_soft).toEqual(expect.objectContaining({ background: tokens.color.danger_subtle, color: '#C42543' }))
    expect(variants.success_soft).toEqual(expect.objectContaining({ background: tokens.color.success_subtle, color: '#00713F' }))
    expect(variants.type_delivery).toEqual(expect.objectContaining({ background: '#D9CCFA', color: '#3F1E96' }))
    expect(variants.type_pickup).toEqual(expect.objectContaining({ background: '#B9E4E8', color: '#0A4E55' }))
    expect(variants.type_in_store).toEqual(expect.objectContaining({ background: '#FAD4B4', color: '#7A3505' }))
    // The delivery position is a badge in the type's colour: the slot of a button that painted it is gone.
    expect(components.order_card.slots.position).toBeUndefined()
    expect(components.order_card.base.time_text).toEqual(expect.objectContaining({ fontSize: 12, weight: 600 }))
  })

  it('controls and rows: buttons in a row 44, the pill 32 with 10 at its sides, menu rows and list rows 50, tall rows 76', () => {
    expect(components.order_card.slots.accept.size).toBe('md')
    expect(components.order_card.slots.reject.size).toBe('md')
    expect(components.button.sizes.sm.padding_x).toBe(tokens.space.sm)
    expect(components.button.sizes.sm.text).toEqual(expect.objectContaining({ fontSize: 12, weight: 600, fontFamily: tokens.typography.label.fontFamily }))
    expect(components.menu.base.item_height).toBe(tokens.size.lg)
    expect(components.list_row.base.padding_y).toBe(tokens.space.sm)
    expect(components.list_row.base.tall_min_height).toBe(76)
    expect(components.header.base.gap).toBe(tokens.space.xs)
    expect(components.divider.variants.vertical.spacing).toBe(0)
  })

  it('the sheet, the stepper, the photo and the review: the boards\' numbers', () => {
    expect(components.sheet.base.handle_height).toBe(4)
    expect(components.stepper.base.value).toEqual(tokens.typography.h3)
    expect(components.stepper.base.value_min_width).toBe(28)
    expect(components.order_request.base).toEqual(expect.objectContaining({ photo_size: 72, photo_tile_height: 120, photo_tile_icon_size: 28 }))
    expect(components.avatar.sizes.lg).toEqual(expect.objectContaining({ size: 56, icon_size: 26 }))
    expect(components.avatar.sizes.sm).toEqual(expect.objectContaining({ size: 32, icon_size: 18 }))
    expect(components.rating_scale.base.min_height).toBe(56)
    expect(components.rating_scale.base.label).toEqual(tokens.typography.body_sm)
  })

  it('the order\'s pieces: the cash block 64, the quantity box 28, the timer and total texts, the sub-titles', () => {
    expect(components.order_details.base.collect_min_height).toBe(64)
    expect(components.order_details.base.quantity_size).toBe(28)
    expect(components.order_details.base.subtitle).toEqual(expect.objectContaining({ fontSize: 12, fontFamily: tokens.typography.label.fontFamily }))
    expect(components.order_card.base.time_text).toEqual(expect.objectContaining({ fontSize: 12, fontFamily: tokens.typography.label.fontFamily }))
    expect(components.order_card.base.total_text).toEqual(expect.objectContaining({ fontSize: 16, fontFamily: tokens.typography.label.fontFamily }))
    expect(components.order_card.base.title_text).toEqual(expect.objectContaining({ fontSize: 16, fontFamily: tokens.typography.label.fontFamily }))
    expect(components.account_page.base.title_min_height).toBe(34)
    expect(components.empty_state.base.icon_box_size).toBe(88)
    expect(components.empty_state.base.image_size).toBe(180)
  })

  it('every new key is editable: a typed node with a range or level control and a label the editor has', () => {
    const newKeys = [
      'button.shapes.icon.icon_size', 'list_row.base.trailing_icon_size', 'list_row.base.tall_min_height', 'input.base.trailing_icon_size',
      'order_details.base.detail_icon_size', 'order_details.base.collect_min_height', 'order_details.base.quantity_size', 'order_details.base.subtitle',
      'new_order_alert.base.icon_size', 'sheet.base.handle_height', 'stepper.base.value_min_width', 'order_request.base.photo_size',
      'order_request.base.photo_tile_height', 'order_request.base.photo_tile_icon_size', 'rating_scale.base.min_height',
      'order_card.base.title_text', 'order_card.base.time_text', 'order_card.base.total_text', 'account_page.base.title_min_height',
      'empty_state.base.icon_box_size'
    ]
    for (const key of newKeys) {
      const node = key.split('.').reduce((at: any, part) => at[part], schema.components)
      expect(node.$type).toMatch(/^(number|dimension|typography)$/)
      expect(node.$extensions['co.ordering.editor'].control).toMatch(/^(range|level)$/)
      // Its label is its property name\'s, in the editor\'s table.
      const label = schema.editor.props[key.split('.').pop() as string]?.label
      expect(label?.key).toMatch(/^BUILDER_THEME_PROP_/)
      expect(label?.default).toBeTruthy()
    }
  })

  it('names the request photo\'s size as the Dashboard\'s catalog does: one key, one text', () => {
    expect(schema.editor.props.photo_size.label).toEqual({ key: 'BUILDER_THEME_PROP_PHOTO_SIZE', default: 'Photo size' })
  })
})

describe('Identity still moves the defaults', () => {
  const radius = (level: string) => themed({ tokens: { border_style: { radius: level } } }).native.components

  it('square takes every corner to 0 and pill to the round one, the tighter and the wider ones too', () => {
    for (const level of ['none', 'full']) {
      const c = radius(level)
      const expected = level === 'none' ? 0 : c.button.shapes.round.radius
      for (const value of [c.button.base.radius, c.button.shapes.icon.radius, c.input.base.radius, c.card.base.radius, c.badge.base.radius, c.modal.base.radius, c.sheet.base.radius, c.tabs.variants.pill.radius, c.tabs.variants.pill.tab_radius]) {
        expect(value).toBe(expected)
      }
    }
  })

  it('a level in between moves them all together', () => {
    const c = radius('lg')
    for (const value of [c.button.base.radius, c.input.base.radius, c.card.base.radius, c.modal.base.radius, c.sheet.base.radius]) expect(value).toBe(15)
  })

  it('a theme that wants shadows gets them on the boxes, and the map\'s keep theirs', () => {
    const c = themed({ tokens: { shadow_style: { size: 'md' } } }).native.components
    expect(c.card.base.shadow.shadowOpacity).toBeGreaterThan(0)
    expect(c.bottom_bar.base.shadow.shadowOpacity).toBeGreaterThan(0)
    expect(c.sheet.base.shadow.shadowOpacity).toBeGreaterThan(0)
    expect(c.button.variants.primary.solid.shadow.shadowOpacity).toBeGreaterThan(0)
    const none = themed({ tokens: { shadow_style: { size: 'none' } } }).native.components
    expect(none.map_marker.base.shadow.shadowOpacity).toBeGreaterThan(0)
  })

  it('a theme without lines takes them off the fields, the chips and the cards, and no others', () => {
    const c = themed({ tokens: { border_style: { width: 'none' } } }).native.components
    expect(c.input.base.border).toEqual({ borderWidth: 0 })
    expect(c.chip.base.border).toEqual({ borderWidth: 0 })
    expect(c.card.base.border).toEqual({ borderWidth: 0 })
    const thick = themed({ tokens: { border_style: { width: 'thick' } } }).native.components
    expect(thick.input.base.border.borderWidth).toBe(2)
    expect(thick.input.base.border.borderColor).toBe(defaultAppTheme().native.tokens.color.border_strong)
  })
})

describe('the schema offers what the design reads', () => {
  it('has the Identity defaults of the mockups', () => {
    expect(schema.tokens.shadow_style.size.$value).toBe('none')
    expect(schema.tokens.border_style.width.$value).toBe('thin')
    expect(schema.tokens.border_style.radius.$value).toBe('md')
  })

  it('keeps the tighter and wider corners following Identity, with Medium out of their options', () => {
    for (const node of [schema.components.button.base.radius, schema.components.button.shapes.icon.radius, schema.components.input.base.radius, schema.components.modal.base.radius, schema.components.sheet.base.radius, schema.components.tabs.variants.pill.radius]) {
      expect(node.$extensions['co.ordering'].follows).toBe('radius')
      expect(node.$extensions['co.ordering'].options).not.toContain('md')
    }
  })

  it('lets the new slots and shapes be chosen in the editor', () => {
    const shapeOptions = (slot: any) => slot.$extensions['co.ordering.editor'].fields.shape.options.map((o: any) => o.value)
    expect(shapeOptions(schema.components.chat_bubble.slots.send)).toContain('round')
    expect(shapeOptions(schema.components.profile_photo.slots.edit)).toContain('round')
    expect(schema.components.chat_bubble.slots.send.$value.shape).toBe('round')
    expect(schema.components.tutorial.slots.skip.$extensions['co.ordering.editor'].label.key).toBe('BUILDER_THEME_SLOT_SKIP')
  })

  it('says the review slot belongs to the assign request, not to the order\'s details', () => {
    const editor = schema.components.order_details.slots.review.$extensions['co.ordering.editor']
    expect(editor.label.default).toMatch(/assign request/i)
    expect(editor.info.default).toMatch(/bottom bar/i)
  })

  it('has no editor label key a node does not use', () => {
    const text = JSON.stringify(schema)
    expect(text).not.toContain('"BUILDER_THEME_SLOT_REVIEW"')
  })
})
