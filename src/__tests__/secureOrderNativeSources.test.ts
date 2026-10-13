import fs from 'fs'
import path from 'path'

const androidJava = path.resolve(
  __dirname,
  '../../android/app/src/main/java/com/deliveryapp'
)

const applicationFile = path.join(androidJava, 'MainApplication.kt')
const extensionFile = path.join(androidJava, 'NotificationServiceExtension.kt')

describe('SecureOrder native sources', () => {
  it('keeps the notification extension in its own file without a SecureOrder reference from MainApplication', () => {
    const application = fs.readFileSync(applicationFile, 'utf8')
    const extension = fs.readFileSync(extensionFile, 'utf8')

    expect(extension).toContain('object SecureOrder')
    expect(extension).toContain('class NotificationServiceExtension')
    expect(application).not.toMatch(/\bSecureOrder\b/)

    const prefs = extension.match(/const val PREFS = "([^"]+)"/)[1]
    const projectKey = extension.match(/const val PROJECT_KEY = "([^"]+)"/)[1]
    expect(application).toContain(`"${prefs}"`)
    expect(application).toContain(`"${projectKey}"`)
  })
})
