/**
 * The images bundled in the binary (`BUNDLED_IMAGES.<group>.<name>`).
 * A theme image (`themeImage`) falls back to one of them while the theme sets
 * no URL (IMAGE_FALLBACKS below). The app's icons are glyphs (shared/Icon), not images.
 */
export const BUNDLED_IMAGES: any = {
  logos: {
    logotypeInvert: require('../assets/images/logotype-invert.png'),
  },
  general: {
    // The square logo of the native launch splash (react-native-bootsplash, docs/SPLASH.md), which the loading
    // page repeats: generated from assets/bootsplash/logo-source.png (scripts/splash-logo.mjs).
    loadingSplash: require('../assets/images/launch-logo.png'),
    deliveryWaiting: require('../assets/images/delivery-waiting.png'),
  },
  backgroundsImages: {
    login: require('../assets/images/background.png'),
  },
  dummies: {
    businessLogo: require('../assets/images/dummies/store.png'),
  },
  tutorials: {
    slide1: require('../assets/images/slide1.jpg'),
    slide2: require('../assets/images/slide2.jpg'),
    slide3: require('../assets/images/slide3.jpg'),
    slide4: require('../assets/images/slide4.jpg'),
    slide5: require('../assets/images/slide5.jpg'),
  },
}

/**
 * Theme image key → the bundled image painted while the theme sets no URL
 * (`group.name` in BUNDLED_IMAGES). `placeholder.customer` has none: without a
 * theme image a person without a photo is drawn as a glyph; `empty.not_found` and `empty.new_order`
 * have none: without a theme image the empty state and the new-order dialog draw an icon
 * (`NotFoundSource`, `NewOrderNotification`).
 */
export const IMAGE_FALLBACKS: Record<string, string> = {
  logotype: 'logos.logotypeInvert',
  home_hero: 'backgroundsImages.login',
  'onboarding.slide_1': 'tutorials.slide1',
  'onboarding.slide_2': 'tutorials.slide2',
  'onboarding.slide_3': 'tutorials.slide3',
  'onboarding.slide_4': 'tutorials.slide4',
  'onboarding.slide_5': 'tutorials.slide5',
  'empty.schedule_blocked': 'general.deliveryWaiting',
  'placeholder.business_logo': 'dummies.businessLogo',
}
