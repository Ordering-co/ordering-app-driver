export function getOrderDetailsAcceptLoading ({
  orderLoading,
  loadingOrder
}: {
  orderLoading?: boolean
  loadingOrder?: boolean
}) {
  const inFlight = Boolean(orderLoading || loadingOrder)
  return {
    loading: inFlight,
    isLoadingOrder: inFlight
  }
}

export function shouldCloseAcceptModalOnStatusChange ({
  acceptModalOpen,
  orderStatus,
  previousOrderStatus
}: {
  acceptModalOpen: boolean
  orderStatus?: number
  previousOrderStatus?: number
}) {
  if (!acceptModalOpen) return false
  if (previousOrderStatus === undefined) return false
  return orderStatus !== previousOrderStatus
}
