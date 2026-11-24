import React from 'react'

import { OModal } from '../shared'
import { ReviewCustomer } from '../ReviewCustomer'

/** The statuses of an order the driver can review its customer after: the order is over. */
const REVIEWABLE_STATUSES = [1, 2, 5, 6, 10, 11, 12, 16, 17]

/** The driver can review the customer of this order: it is over, it has a customer and it was not reviewed yet. */
export const canReviewCustomer = (order: any) =>
  !order?.user_review && REVIEWABLE_STATUSES.includes(order?.status) && !!order?.customer_id

/** The modal of the customer's review, of the details and of the assign request. */
export const ReviewCustomerModal = ({ order, open, onClose }: { order: any, open: boolean, onClose: () => void }) => (
  <OModal
    open={open}
    onClose={onClose}
    entireModal
    customClose
  >
    <ReviewCustomer
      order={order}
      closeModal={onClose}
      onClose={onClose}
    />
  </OModal>
)
