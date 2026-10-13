export function parseStoredOfflineActions (stored: unknown) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return {}
  }

  return stored as Record<string, any[]>
}

export function getOfflineActionsAfterReplay ({
  queued,
  succeededOrderIds
}: {
  queued: Record<string, unknown>
  succeededOrderIds: Array<string | number>
}) {
  const remaining = { ...queued }

  for (const orderId of succeededOrderIds) {
    delete remaining[String(orderId)]
  }

  return {
    remaining,
    shouldClearAll: Object.keys(remaining).length === 0
  }
}
