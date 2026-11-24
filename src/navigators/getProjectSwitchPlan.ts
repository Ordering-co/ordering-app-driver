export const INITIAL_GENERAL_PROJECT_STATE = { changed: false, setted: false }

export function getStoredProjectSettedPatch (storedProjectName: unknown) {
  if (!storedProjectName) return null
  return { setted: true as const }
}

export function getProjectLoginSuccessPlan ({
  projectChanged,
  user
}: {
  projectChanged?: boolean
  user?: any
}) {
  if (!projectChanged) {
    return { shouldPersistSessionAndRestart: false as const }
  }

  return {
    shouldPersistSessionAndRestart: true as const,
    session: {
      user,
      token: user?.session?.access_token
    }
  }
}
