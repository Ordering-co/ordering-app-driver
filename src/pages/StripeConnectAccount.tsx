import React from 'react'
import { SafeAreaContainerLayout, StripeConnectAccount as StripeConnectAccountController } from '@ui'
interface Props {
  navigation: any;
  route: any;
}

const StripeConnectAccount = (props: Props) => {
  const stripeConnectAccountProps = {
    ...props
  }

  return (
    <SafeAreaContainerLayout paddingHorizontal={0}>
      <StripeConnectAccountController {...stripeConnectAccountProps} />
    </SafeAreaContainerLayout>
  )
}

export default StripeConnectAccount
