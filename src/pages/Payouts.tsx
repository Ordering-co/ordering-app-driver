import React from 'react'
import { SafeAreaContainerLayout, Payouts as PayoutsController } from '@ui'
interface Props {
  navigation: any;
  route: any;
}

const Payouts = (props: Props) => {
  const payoutsProps = {
    ...props
  }

  return (
    <SafeAreaContainerLayout paddingHorizontal={0}>
      <PayoutsController {...payoutsProps} />
    </SafeAreaContainerLayout>
  )
}

export default Payouts
