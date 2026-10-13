import fs from 'fs'
import path from 'path'

describe('DeliveryApp offline actions', () => {
  it('mounts OfflineActionsProvider inside OrderingProvider', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../DeliveryApp.tsx'),
      'utf8'
    )

    expect(src).toContain('OfflineActionsProvider')
    expect(src).toMatch(
      /<OrderingProvider[\s\S]*<OfflineActionsProvider>[\s\S]*<\/OfflineActionsProvider>[\s\S]*<\/OrderingProvider>/
    )
  })
})
