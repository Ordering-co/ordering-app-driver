import React from 'react'

import { ODivider } from '../shared'
import { ProductItemAccordion } from '../ProductItemAccordion'

/** The products of an order, one line each with the details' divider between them (the details and the assign request's screen). */
export const ProductLines = ({ order }: { order: any }) => (
  <>
    {order?.products?.length > 0 &&
      order.products.map((product: any, i: number) => (
        <React.Fragment key={product?.id || i}>
          {i > 0 && <ODivider />}
          <ProductItemAccordion
            product={product}
            currency={order?.currency}
          />
        </React.Fragment>
      ))}
  </>
)
