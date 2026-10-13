function asOptionsList (value: unknown) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

export function parseProductOptions (options: unknown) {
  if (typeof options !== 'string') {
    return asOptionsList(options)
  }

  try {
    return asOptionsList(JSON.parse(options))
  } catch {
    return []
  }
}
