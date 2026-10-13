import fs from 'fs'
import path from 'path'

describe('RootNavigator denied location GPS', () => {
  it('awaits permission results and gates GPS on isGrantedPermissions', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../RootNavigator.tsx'),
      'utf8'
    )

    expect(src).toContain('areAllPermissionResultsGranted')
    expect(src).toContain('Promise.all')
    expect(src).not.toMatch(/permissions\.every\(async/)
    expect(src).toContain('permissionsGranted: isGrantedPermissions')
    expect(src).toMatch(/if\s*\(\s*!isGrantedPermissions\s*\)/)
  })
})
