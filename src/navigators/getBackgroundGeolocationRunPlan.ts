export function getBackgroundGeolocationRunPlan ({
  ready,
  auth,
  userEnabled,
  blockedSchedule,
  driverLoginValidated,
  permissionsGranted
}: {
  ready?: unknown
  auth?: unknown
  userEnabled?: unknown
  blockedSchedule?: unknown
  driverLoginValidated?: unknown
  permissionsGranted?: unknown
}) {
  const scheduleBlocksTracking = !!blockedSchedule && !!driverLoginValidated
  const shouldRun = !!ready && !!auth && !!userEnabled && !!permissionsGranted && !scheduleBlocksTracking

  return {
    shouldStart: shouldRun,
    shouldStop: !shouldRun
  }
}
