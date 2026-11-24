import fs from 'fs'
import path from 'path'

describe('DeliveryApp splash', () => {
  it('draws the launch logo the native splash shows, from one bundled file', () => {
    // The bundled images live with the theme (src/theme/bundledImages.ts).
    const src = fs.readFileSync(
      path.join(__dirname, '../theme/bundledImages.ts'),
      'utf8'
    )

    expect(src).toContain("loadingSplash: require('../assets/images/launch-logo.png')")
    expect(src).not.toContain('Platform')
  })

  it('hides the native splash through useSplashHide, with the container\'s onReady, never when the theme is read', () => {
    const app = fs.readFileSync(path.join(__dirname, '../DeliveryApp.tsx'), 'utf8')
    const container = fs.readFileSync(path.join(__dirname, '../appContainer.tsx'), 'utf8')

    // allowed once the cached theme is read (and, with several projects, the project list)
    expect(app).toContain('useSplashHide(cachedTheme !== undefined && (!configStore.loading || !settings.use_root_point))')
    expect(app).toMatch(/<AppContainer\s+onReady=\{onContainerReady\}(?=\s|\/)/)
    // the loading page tells the splash when its logo has loaded, through this context
    expect(app).toContain('<SplashLogoContext.Provider value={logoSignal}>')
    expect(app).not.toContain('hideSplash')
    expect(container).toContain('<NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={onReady}>')
    expect(app).not.toContain('react-native-splash-screen')
  })
})
