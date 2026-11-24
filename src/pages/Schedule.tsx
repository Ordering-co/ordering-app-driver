import React from 'react'
import { useSession } from '@components'
import { SafeAreaContainerLayout, DriverSchedule as DriverScheduleController } from '@ui'

interface Props {
  navigation: any;
  route: any;
}

/** The driver's week, a screen of the account: the schedule of the session's user, read-only. */
const Schedule = ({ navigation }: Props) => {
  const [{ user }] = useSession()

  return (
    <SafeAreaContainerLayout>
      <DriverScheduleController schedule={user?.schedule} navigation={navigation} />
    </SafeAreaContainerLayout>
  )
}

export default Schedule
