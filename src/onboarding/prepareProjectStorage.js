// Run before mounting the SDK: its session and offline queues are not tenant-scoped.
export const PROJECT_SCOPE_KEY = 'ordering_onboarding_scope'
const SESSION_KEYS = ['token', 'user', 'device_code', 'notification_state', 'user-customer', 'country-code', 'options']
const ORDER_KEYS = ['offline_actions_array', 'active_orders', 'pending_orders', 'inProgress_orders', 'completed_orders', 'cancelled_orders', 'last_date_connection', 'disconnected_at', 'auto_print_after_accept_order']

export const hasConfiguredProject = settings => Boolean(
  settings.project && settings.project !== 'YOUR_PROJECT'
)

// An existing project is normal app configuration, not consent to migrate local data.
export const isProjectOnboardingEnabled = (settings, development = false, nativeLocalMode = false) => Boolean(
  development && (settings.localProjectConfigured === true || settings.localSimulatorMode === true || nativeLocalMode === true)
)

export const getProjectScope = settings => JSON.stringify({
  project: settings.project,
  url: settings.api.url.replace(/\/$/, ''),
  version: settings.api.version,
  ...(settings.localSimulatorMode ? { localSimulator: true } : {})
})

async function retirePreviousProject (previousScope, storage) {
  const entries = await storage.multiGet(ORDER_KEYS)
  const previousOrders = entries.filter(([, value]) => value !== null)
  if (previousOrders.length) {
    // Keep unsubmitted work locally, outside keys read/replayed by the app.
    // Never archive session tokens or auto-replay this quarantine on switching back.
    await storage.setItem(`ordering_onboarding_quarantine_${Date.now()}`, JSON.stringify({
      previousScope, entries: previousOrders
    }))
  }
  await storage.multiRemove([...SESSION_KEYS, ...ORDER_KEYS])
}

export async function prepareProjectStorage (settings, storage, { development = false } = {}) {
  // Normal development and Release preserve the original selector/storage behavior.
  // Only explicit local setup may migrate known session/queue keys.
  const onboardingEnabled = isProjectOnboardingEnabled(settings, development)
  const previousScope = onboardingEnabled ? await storage.getItem(PROJECT_SCOPE_KEY) : null
  // Restoring the placeholder disconnects a configured tenant before mounting the SDK.
  // Preserve legacy project-picker behavior only when no configured scope existed.
  if (!onboardingEnabled || !hasConfiguredProject(settings)) {
    if (previousScope) {
      await retirePreviousProject(previousScope, storage)
      await storage.removeItem('project_name')
      await storage.removeItem(PROJECT_SCOPE_KEY)
    }
    const storedProject = settings.use_root_point ? await storage.getItem('project_name') : null
    if (!settings.use_root_point) await storage.removeItem('project_name')
    let project = null
    try { project = JSON.parse(storedProject) } catch {}
    return { ...settings, api: { ...settings.api }, socket: { ...settings.socket }, project: project || settings.project }
  }

  const scope = getProjectScope(settings)
  if (previousScope !== scope) await retirePreviousProject(previousScope, storage)
  await storage.removeItem('project_name')
  await storage.setItem(PROJECT_SCOPE_KEY, scope)
  // The SDK reads this runtime flag for its own project_name polling. Source flags stay intact.
  return { ...settings, api: { ...settings.api }, socket: { ...settings.socket }, use_root_point: false }
}
