type FirebasePushGate = {
  configsLoading?: boolean
  enabled?: unknown
  auth?: unknown
}

export function isFirebasePushEnabled (configs: any) {
  return configs?.firebase_push_enabled?.value === '1'
}

export function shouldSetupFirebasePush (params: FirebasePushGate) {
  return !params.configsLoading && !!params.enabled && !!params.auth
}

export function shouldTeardownFirebasePush (params: FirebasePushGate) {
  return !params.configsLoading && !shouldSetupFirebasePush(params)
}

export function getOpenedPushOrderData (data: any) {
  const clean = (value: any) => (value == null || value === '' || value === 'null' ? null : value)
  return {
    id: clean(data?.order_id),
    assignId: clean(data?.assign_request_id),
    group_id: clean(data?.order_group_id)
  }
}
