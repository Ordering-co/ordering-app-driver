import { defaultAppTheme } from '../../../../../theme/engine'
import { themeVisible } from '../../../../../theme/helpers'
import SCHEMA from '../../../../../../product.schema.json'

const theme: any = defaultAppTheme()

describe('what the route reads from the theme', () => {
  it('is shown by default: the option of the orders list is on', () => {
    expect(themeVisible(theme, 'orders.route')).toBe(true)
    expect((SCHEMA as any).visibility['orders.route'].$value).toBe(true)
  })

  it('draws its line and its stops with the map marker\'s keys: a stop disc is smaller than the store and customer discs, the next one larger', () => {
    const marker = theme.native.components.map_marker.base
    expect(marker.stop_size).toBeLessThan(marker.size)
    expect(marker.stop_next_size).toBeGreaterThan(marker.stop_size)
    expect(marker.line_color).toBe(theme.native.tokens.color.primary)
    expect(marker.line_next_width).toBeGreaterThan(marker.line_width)
    // A dash longer than the line is wide reads as a dash (one as short as the line is wide is a dot, or a tick at a small zoom), and the gap
    // between dashes is clear but shorter than a dash.
    expect(marker.line_dash).toBeGreaterThanOrEqual(2 * marker.line_next_width)
    expect(marker.line_gap).toBeLessThan(marker.line_dash)
    expect(marker.line_gap).toBeGreaterThan(marker.line_next_width)
    // The leg to the next stop is the stronger tone of the brand.
    expect(marker.line_next_color).toBe(theme.native.tokens.color.primary_pressed)
  })

  it('keeps the line\'s ranges around its defaults, with room for a dash longer than the widest line', () => {
    const base = (SCHEMA as any).components.map_marker.base
    const range = (key: string) => base[key].$extensions['co.ordering.editor']
    for (const key of ['line_width', 'line_next_width', 'line_dash', 'line_gap']) {
      expect(base[key].$value).toBeGreaterThanOrEqual(range(key).min)
      expect(base[key].$value).toBeLessThanOrEqual(range(key).max)
    }
    // The shortest dash the editor allows is longer than the thinnest line is wide, and the longest line can have a longer dash.
    expect(range('line_dash').min).toBeGreaterThan(range('line_width').min)
    expect(range('line_dash').max).toBeGreaterThanOrEqual(2 * range('line_next_width').max)
  })

  it('has no page of its own: the route is a map and a panel that cannot move, so no section of a page', () => {
    expect((SCHEMA as any).pages.route).toBeUndefined()
  })
})
