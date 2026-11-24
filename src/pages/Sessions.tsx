import React from 'react'
import { SafeAreaContainerLayout, Sessions as SessionsController } from '@ui'
interface Props {
  navigation: any;
  route: any;
}

const Sessions = (props: Props) => {
  const sessionsProps = {
    ...props
  }

  return (
    <SafeAreaContainerLayout>
      <SessionsController {...sessionsProps} />
    </SafeAreaContainerLayout>
  )
}

export default Sessions
