import dayjs from 'dayjs'
import { getDriverScheduleBlockPlan } from '../getDriverScheduleBlockPlan'

const emptyDay = { enabled: false, lapses: [] }

const lapse = (
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute: number
) => ({
  open: { hour: openHour, minute: openMinute },
  close: { hour: closeHour, minute: closeMinute }
})

const weekWithWednesdayWindow = {
  schedule: [
    emptyDay,
    emptyDay,
    emptyDay,
    { enabled: true, lapses: [lapse(13, 0, 18, 0)] },
    { enabled: true, lapses: [lapse(9, 0, 17, 0)] },
    emptyDay,
    emptyDay
  ]
}

describe('getDriverScheduleBlockPlan', () => {
  it('unblocks when the current time is inside an enabled lapse', () => {
    const plan = getDriverScheduleBlockPlan({
      user: weekWithWednesdayWindow,
      now: dayjs('2026-08-26T14:00:00')
    })

    expect(plan.blocked).toBe(false)
    expect(plan.nextSchedule).toEqual({ schedule: null, day: null })
  })

  it('stays blocked before today\'s lapse and points at that lapse', () => {
    const plan = getDriverScheduleBlockPlan({
      user: weekWithWednesdayWindow,
      now: dayjs('2026-08-26T10:00:00')
    })

    expect(plan.blocked).toBe(true)
    expect(plan.nextSchedule).toEqual({
      schedule: lapse(13, 0, 18, 0),
      day: 3
    })
  })

  it('stays blocked when today is disabled', () => {
    const plan = getDriverScheduleBlockPlan({
      user: {
        schedule: [
          emptyDay,
          emptyDay,
          emptyDay,
          emptyDay,
          { enabled: true, lapses: [lapse(9, 0, 17, 0)] },
          emptyDay,
          emptyDay
        ]
      },
      now: dayjs('2026-08-26T14:00:00')
    })

    expect(plan.blocked).toBe(true)
    expect(plan.nextSchedule.day).toBe(4)
  })

  it('is not blocked when there is no user', () => {
    expect(getDriverScheduleBlockPlan({ user: null }).blocked).toBe(false)
  })

  it('is not blocked when no schedule day is enabled', () => {
    expect(getDriverScheduleBlockPlan({
      user: { schedule: [emptyDay, emptyDay, emptyDay, emptyDay, emptyDay, emptyDay, emptyDay] },
      now: dayjs('2026-08-26T14:00:00')
    }).blocked).toBe(false)
  })
})
