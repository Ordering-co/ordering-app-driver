import React, { useState } from 'react'

import { ReviewCustomerModal, canReviewCustomer } from '../reviewCustomer'
import { FloatingButton } from '../../FloatingButton'

import { useLanguage } from '@components'

/**
 * The bottom bar of an order that is over, with its one action: review its customer (page section `review`, for
 * an order `canReviewCustomer` accepts). It opens the same review modal.
 */
export const FocusReviewBar = ({ order }: { order: any }) => {
  const [, t] = useLanguage()
  const [open, setOpen] = useState(false)
  if (!canReviewCustomer(order)) return null
  return (
    <>
      <FloatingButton
        btnText={t('REVIEW_CUSTOMER', 'Review customer')}
        firstButtonClick={() => setOpen(true)}
        slot='button'
        isPadding={true}
      />
      <ReviewCustomerModal order={order} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
