import { joinTitle, orderNumberTag, ORDER_TITLE_SEPARATOR } from '../orderTitle'

describe('orderTitle', () => {
  it('writes the number with its "#", none without an id', () => {
    expect(orderNumberTag(1049)).toBe('#1049')
    expect(orderNumberTag('12****')).toBe('#12****')
    expect(orderNumberTag('')).toBe('')
    expect(orderNumberTag(undefined)).toBe('')
    expect(orderNumberTag(null)).toBe('')
  })

  it('joins the parts that are there with the one separator', () => {
    expect(ORDER_TITLE_SEPARATOR).toBe(' · ')
    expect(joinTitle(['#1049', 'Nina Ross'])).toBe('#1049 · Nina Ross')
    expect(joinTitle(['#1049', ''])).toBe('#1049')
    expect(joinTitle(['', undefined, false, null, 'Nina Ross'])).toBe('Nina Ross')
    expect(joinTitle([])).toBe('')
  })
})
