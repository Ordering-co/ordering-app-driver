import { parseProductOptions } from '../parseProductOptions'

const toppings = [
  {
    name: 'Toppings',
    suboptions: [{ quantity: 1, name: 'Cheese', position: 'whole', price: 2 }]
  }
]

describe('parseProductOptions', () => {
  it('keeps an options array', () => {
    expect(parseProductOptions(toppings)).toEqual(toppings)
  })

  it('parses a JSON array string', () => {
    expect(parseProductOptions(JSON.stringify(toppings))).toEqual(toppings)
    expect(parseProductOptions('[]')).toEqual([])
  })

  it('returns an empty list for malformed JSON', () => {
    expect(parseProductOptions('[{"name":')).toEqual([])
    expect(parseProductOptions('{')).toEqual([])
  })

  it('returns an empty list for missing or non-list values', () => {
    expect(parseProductOptions(null)).toEqual([])
    expect(parseProductOptions(undefined)).toEqual([])
    expect(parseProductOptions('null')).toEqual([])
    expect(parseProductOptions('"nope"')).toEqual([])
  })

  it('uses object values when options is a keyed map', () => {
    expect(parseProductOptions({
      12: toppings[0]
    })).toEqual(toppings)
  })
})
