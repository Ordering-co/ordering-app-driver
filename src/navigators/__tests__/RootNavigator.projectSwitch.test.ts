import fs from 'fs'
import path from 'path'

describe('RootNavigator project switch', () => {
  it('listens for change_project and passes projectChanged into Login', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../RootNavigator.tsx'),
      'utf8'
    )

    expect(src).toContain("DeviceEventEmitter.addListener('change_project'")
    expect(src).toContain('projectChanged={generalProjectState.changed}')
  })
})
