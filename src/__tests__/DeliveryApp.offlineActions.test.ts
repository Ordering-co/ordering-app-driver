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

  it('gives the order provider an alert that is a notice: its errors tell, they do not ask', () => {
    const src = fs.readFileSync(path.join(__dirname, '../DeliveryApp.tsx'), 'utf8')

    expect(src).toMatch(/const NoticeAlert = \(props: any\) => <Alert \{\.\.\.props\} notice \/>/)
    expect(src).toContain('Alert={NoticeAlert}')
    expect(src).not.toContain('Alert={Alert}')
  })
})
