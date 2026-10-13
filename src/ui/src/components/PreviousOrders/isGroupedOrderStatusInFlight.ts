export function isGroupedOrderStatusInFlight ({
  loadingChangeOrder,
  submitting
}: {
  loadingChangeOrder?: boolean
  submitting?: boolean
}) {
  return Boolean(loadingChangeOrder || submitting)
}
