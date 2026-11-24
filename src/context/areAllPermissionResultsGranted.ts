export function areAllPermissionResultsGranted (
  results: unknown,
  granted: unknown = 'granted'
) {
  if (Array.isArray(results)) {
    if (results.length === 0) return false
    return results.every((status) => status === granted)
  }

  if (results && typeof results === 'object') {
    const values = Object.values(results as Record<string, unknown>)
    if (values.length === 0) return false
    return values.every((status) => status === granted)
  }

  return false
}
