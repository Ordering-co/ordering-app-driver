import { renderHook } from '@testing-library/react-native'

import { useDriverOrderStage } from '../useDriverOrderStage'

const orderWith = (status: number, at: any, assignedAt = '2026-07-27 19:41:30') => ({
  status,
  last_driver_assigned_at: assignedAt,
  reporting_data: { at }
})

const stageOf = (order: any) => renderHook(() => useDriverOrderStage(order)).result.current

describe('useDriverOrderStage', () => {
  it('only acts on ready for pickup', () => {
    const at = { 'status:8': '2026-07-27 19:41:30' }
    expect(stageOf(orderWith(4, at))).toEqual({ effectiveStatus: 8, isPickupPhase: true })
    expect(stageOf(orderWith(7, at))).toEqual({ effectiveStatus: 7, isPickupPhase: false })
    expect(stageOf(orderWith(14, at))).toEqual({ effectiveStatus: 14, isPickupPhase: false })
    expect(stageOf(orderWith(3, at))).toEqual({ effectiveStatus: 3, isPickupPhase: false })
  })

  it('passes every status other than ready for pickup straight through', () => {
    const at = {
      'status:8': '2026-08-12 20:16:47',
      'status:3': '2026-08-12 20:17:01',
      'status:9': '2026-08-12 20:29:08',
      'status:26': '2026-08-12 22:30:08'
    }

    Array.from({ length: 27 }, (_, status) => status)
      .filter((status) => status !== 4)
      .forEach((status) => {
        expect(stageOf(orderWith(status, at))).toEqual({
          effectiveStatus: status,
          isPickupPhase: false
        })
      })
  })

  it('keeps the status when the driver never took the order', () => {
    const order = orderWith(4, {
      'status:0': '2026-07-27 19:40:57',
      'status:7': '2026-07-27 19:41:11'
    })
    expect(stageOf(order)).toEqual({ effectiveStatus: 4, isPickupPhase: false })
  })

  it('keeps the status for orders without reporting data', () => {
    expect(stageOf({ status: 4 })).toEqual({ effectiveStatus: 4, isPickupPhase: false })
    expect(stageOf({ status: 4, reporting_data: { at: {} } })).toEqual({
      effectiveStatus: 4,
      isPickupPhase: false
    })
  })

  it('resolves the stage the driver was in when the business marked it ready', () => {
    const order = orderWith(4, {
      'status:0': '2026-07-27 19:40:57',
      'status:7': '2026-07-27 19:41:11',
      'status:8': '2026-07-27 19:41:30',
      'status:3': '2026-07-27 20:05:12'
    })
    expect(stageOf(order)).toEqual({ effectiveStatus: 3, isPickupPhase: true })
  })

  it('does not flag the pickup phase once the driver is out for delivery', () => {
    const order = orderWith(4, {
      'status:8': '2026-07-27 19:41:30',
      'status:9': '2026-08-12 16:08:59',
      'status:26': '2026-08-12 22:30:08'
    })
    expect(stageOf(order)).toEqual({ effectiveStatus: 26, isPickupPhase: false })
  })

  it('covers order 1247005 when the business marked it ready at 20:13:15', () => {
    const order = orderWith(
      4,
      {
        'status:0': '2026-08-12 20:11:43',
        'status:7': '2026-08-12 20:11:44',
        'status:8': '2026-08-12 20:12:30',
        'status:3': '2026-08-12 20:12:45',
        driver_assigned: '2026-08-12 20:12:30'
      },
      '2026-08-12 20:12:30'
    )
    expect(stageOf(order)).toEqual({ effectiveStatus: 3, isPickupPhase: true })
  })

  it('covers order 1247005 when the business marked it ready at 20:17:23', () => {
    const order = orderWith(
      4,
      {
        'status:0': '2026-08-12 20:11:43',
        'status:7': '2026-08-12 20:13:54',
        'status:8': '2026-08-12 20:16:47',
        'status:3': '2026-08-12 20:17:01',
        'status:4': '2026-08-12 20:17:23',
        driver_assigned: '2026-08-12 20:16:25'
      },
      '2026-08-12 20:16:25'
    )
    expect(stageOf(order)).toEqual({ effectiveStatus: 3, isPickupPhase: true })
  })

  it('ignores the stages order 1247005 reached before its reassignment', () => {
    const order = orderWith(
      4,
      {
        'status:0': '2026-08-12 20:11:43',
        'status:8': '2026-08-12 20:12:30',
        'status:3': '2026-08-12 20:12:45',
        'status:7': '2026-08-12 20:13:54',
        driver_assigned: '2026-08-12 20:16:25'
      },
      '2026-08-12 20:16:25'
    )
    expect(stageOf(order)).toEqual({ effectiveStatus: 4, isPickupPhase: false })
  })

  it('leaves the order 14425 dump alone, it sits on accepted by business', () => {
    const order = orderWith(7, {
      'status:0': '2026-07-27 19:40:57',
      'status:7': '2026-08-13 22:16:16',
      'status:8': '2026-07-27 19:41:30',
      'status:9': '2026-08-12 16:08:59',
      'status:11': '2026-08-12 22:28:29',
      'status:26': '2026-08-12 22:30:08'
    })
    expect(stageOf(order)).toEqual({ effectiveStatus: 7, isPickupPhase: false })
  })

  it('keeps a stage reached exactly at the assignment time', () => {
    const order = orderWith(4, { 'status:8': '2026-07-27 19:41:30' }, '2026-07-27 19:41:30')
    expect(stageOf(order)).toEqual({ effectiveStatus: 8, isPickupPhase: true })
  })

  it('resolves without an assignment date', () => {
    const order = { status: 4, reporting_data: { at: { 'status:3': '2026-07-27 20:05:12' } } }
    expect(stageOf(order)).toEqual({ effectiveStatus: 3, isPickupPhase: true })
  })

  it('skips malformed timestamps', () => {
    const order = orderWith(4, {
      'status:8': '2026-07-27 19:41:30',
      'status:9': null,
      'status:26': 12345
    })
    expect(stageOf(order)).toEqual({ effectiveStatus: 8, isPickupPhase: true })
  })
})
