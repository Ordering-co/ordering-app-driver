import dayjs, { Dayjs } from 'dayjs'

const EMPTY_NEXT_SCHEDULE = { schedule: null, day: null }

function getNextEnabledSchedule (currentDay: number, schedules: any[]) {
  if (currentDay === 6) {
    return {
      schedule: schedules.find((item: any) => item.enabled)?.lapses[0],
      day: schedules.findIndex((item: any) => item.enabled)
    }
  }

  let j = 0
  for (let i = currentDay; i < currentDay + 6; i++) {
    if (i >= 6) {
      if (schedules[j]?.enabled) {
        return { schedule: schedules[j]?.lapses[0], day: j }
      }
      j++
    } else if (schedules[i]?.enabled) {
      return { schedule: schedules[i]?.lapses[0], day: i }
    }
  }

  return EMPTY_NEXT_SCHEDULE
}

function findLapseAt (lapses: any[] | undefined, now: Dayjs) {
  return lapses?.find((lapse: any) => {
    const from = now.hour(lapse.open.hour).minute(lapse.open.minute)
    const to = now.hour(lapse.close.hour).minute(lapse.close.minute)
    return now.unix() >= from.unix() && now.unix() <= to.unix()
  })
}

export function getDriverScheduleBlockPlan ({
  user,
  now = dayjs()
}: {
  user?: any
  now?: Dayjs
}) {
  if (!user) {
    return { blocked: false, nextSchedule: EMPTY_NEXT_SCHEDULE }
  }

  const schedules = user.schedule
  if (!schedules?.some((item: any) => item?.enabled)) {
    return { blocked: false, nextSchedule: EMPTY_NEXT_SCHEDULE }
  }

  const currentDay = now.day()
  const today = schedules.find((item: any, i: number) => i === currentDay)

  if (!today?.enabled) {
    return {
      blocked: true,
      nextSchedule: getNextEnabledSchedule(currentDay, schedules)
    }
  }

  const lapse = findLapseAt(today.lapses, now)
  if (lapse) {
    return { blocked: false, nextSchedule: EMPTY_NEXT_SCHEDULE }
  }

  const nextLapse = today.lapses?.find((item: any) => {
    const from = now.hour(item.open.hour).minute(item.open.minute)
    return now.unix() <= from.unix()
  })

  return {
    blocked: true,
    nextSchedule: nextLapse
      ? { schedule: nextLapse, day: currentDay }
      : getNextEnabledSchedule(currentDay, schedules)
  }
}
