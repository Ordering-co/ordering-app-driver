import fs from 'fs'
import path from 'path'

const manifest = fs.readFileSync(path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'), 'utf8')

/** The `<intent>` blocks of every `<queries>` of the manifest, as `action scheme` pairs. */
const queries = [...manifest.matchAll(/<queries>([\s\S]*?)<\/queries>/g)].flatMap((block) =>
  [...block[1].matchAll(/<intent>([\s\S]*?)<\/intent>/g)].map((intent) => ({
    action: /android:name="([^"]+)"/.exec(intent[1])?.[1],
    scheme: /android:scheme="([^"]+)"/.exec(intent[1])?.[1]
  }))
)
const has = (action: string, scheme: string) => queries.some((query) => query.action === action && query.scheme === scheme)

describe('AndroidManifest `<queries>` (what Android 11+ lets the app see)', () => {
  it('lets the app see the dialler: a `tel:` link is a phone call, not "link not supported"', () => {
    expect(has('android.intent.action.DIAL', 'tel')).toBe(true)
    expect(has('android.intent.action.VIEW', 'tel')).toBe(true)
  })

  it('lets the app see messages and mail, the other links of a party', () => {
    expect(has('android.intent.action.VIEW', 'sms')).toBe(true)
    expect(has('android.intent.action.VIEW', 'mailto')).toBe(true)
  })

  it('keeps what it had: web and the maps apps', () => {
    for (const scheme of ['http', 'https', 'geo', 'waze', 'google.navigation']) {
      expect(has('android.intent.action.VIEW', scheme)).toBe(true)
    }
  })

  it('keeps the placeholders the Builder replaces', () => {
    expect(manifest).toContain('_GOOGLE_MAPS_API_KEY_')
    expect(manifest).toContain('${usesCleartextTraffic}')
    expect(manifest).toContain('${applicationId}.NotificationServiceExtension')
  })
})
