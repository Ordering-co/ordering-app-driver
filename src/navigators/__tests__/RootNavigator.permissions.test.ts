import fs from 'fs'
import path from 'path'

const read = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8')

describe('RootNavigator denied location GPS', () => {
  it('awaits permission results and gates GPS on isGrantedPermissions', () => {
    const src = read('../RootNavigator.tsx')
    const hook = read('../useDriverLocationTracking.ts')

    expect(src).toContain('areAllPermissionResultsGranted')
    expect(src).toContain('Promise.all')
    expect(src).not.toMatch(/permissions\.every\(async/)
    // The module is STARTED only with the permissions (the run plan in the hook; it is configured without them, so that a
    // session the system ended can be reported with the reason `permission`), and the splash does not wait for them
    // when they are missing (RootNavigator). What the run plan asks is what tracking needs (the position can be read:
    // "While Using" is enough, owner's decision of 2026-11-19), not "Always" (`isGrantedPermissions` gates the rest).
    expect(hook).toContain('permissionsGranted: canTrackLocation')
    expect(hook).not.toContain('permissionsGranted: isGrantedPermissions')
    expect(hook).not.toMatch(/if\s*\(\s*!isGrantedPermissions\b/)
    expect(src).toMatch(/languageState\?\.loading \|\| isGrantedPermissions\)\s*return/)
  })

  it('does not ask for the physical-activity permission (the module has no motion detection)', () => {
    expect(read('../../context/PermissionsContext.tsx')).not.toContain('ACTIVITY_RECOGNITION')
  })
})
