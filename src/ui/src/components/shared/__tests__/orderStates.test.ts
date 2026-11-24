import { orderStatusVariant, timeStateOf, timeStatusVariant } from '../orderStates'
import { themeColor } from '../../../../../theme/helpers'
import { defaultAppTheme } from '../../../../../theme/engine'

/** Pending, in progress, and a status the app does not know. */
const IN_PROGRESS = [0, 13, 3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 99, undefined, null]
const COMPLETED = [1, 11, 15]
const NEGATIVE = [2, 5, 6, 10, 12, 16, 17]

describe('orderStatusVariant (decision D4)', () => {
  it('paints pending and in progress as primary, as a status it does not know', () => {
    for (const status of IN_PROGRESS) expect(orderStatusVariant(status)).toBe('primary')
  })

  it('paints completed as success', () => {
    for (const status of COMPLETED) expect(orderStatusVariant(status)).toBe('success')
  })

  it('paints rejected, cancelled and failed as danger', () => {
    for (const status of NEGATIVE) expect(orderStatusVariant(status)).toBe('danger')
  })

  it('takes the status as the API sends it, a number or its text', () => {
    expect(orderStatusVariant('11')).toBe('success')
    expect(orderStatusVariant('2')).toBe('danger')
    expect(orderStatusVariant(undefined)).toBe('primary')
  })
})

describe('timeStateOf (decision D4)', () => {
  it('maps in time, at risk and delayed to success, warning and danger', () => {
    expect(timeStateOf('in_time')).toBe('success')
    expect(timeStateOf('at_risk')).toBe('warning')
    expect(timeStateOf('delayed')).toBe('danger')
  })

  it('gives no state to an order without a time status', () => {
    expect(timeStateOf(null)).toBeNull()
    expect(timeStateOf(undefined)).toBeNull()
    expect(timeStateOf('unknown')).toBeNull()
  })
})

describe('timeStatusVariant (decision D4)', () => {
  it('paints a time state with its badge', () => {
    expect(timeStatusVariant('in_time')).toBe('success')
    expect(timeStatusVariant('at_risk')).toBe('warning')
    expect(timeStatusVariant('delayed')).toBe('danger')
  })

  it('paints an order without a time status as neutral', () => {
    expect(timeStatusVariant(null)).toBe('neutral')
    expect(timeStatusVariant(undefined)).toBe('neutral')
    expect(timeStatusVariant('unknown')).toBe('neutral')
  })
})
