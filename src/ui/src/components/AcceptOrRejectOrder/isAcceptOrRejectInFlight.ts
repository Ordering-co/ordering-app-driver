export function isAcceptOrRejectInFlight ({
  loading,
  isLoadingOrder,
  submitting
}: {
  loading?: boolean
  isLoadingOrder?: boolean
  submitting?: boolean
}) {
  return Boolean(loading || isLoadingOrder || submitting)
}
