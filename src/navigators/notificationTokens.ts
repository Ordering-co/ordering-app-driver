/**
 * The id of the row of `notification_tokens` that holds `playerId` (the push
 * subscription id OneSignal gave, or the FCM token), from the API's list.
 */
export function findNotificationTokenId (payload: unknown, playerId: unknown) {
  if (playerId == null || playerId === '') return null
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { result?: unknown }).result)
      ? (payload as { result: unknown[] }).result
      : []
  const match = list.find((item: any) => item?.token === playerId)
  return match?.id ?? null
}

export function getNotificationTokensUrl (root: unknown, userId: unknown) {
  if (!root || userId == null || userId === '') return null
  return `${root}/users/${userId}/notification_tokens`
}
