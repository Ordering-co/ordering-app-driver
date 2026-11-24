package co.ordering.delivery

import android.graphics.drawable.ColorDrawable
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/**
 * The color behind the system bars. Where Android draws the app edge to edge (16 and later ignore
 * the opt-out of `styles.xml`), MainActivity pads the content by the bars' insets, so what is
 * painted behind the status bar and the navigation bar is the window's own background. JavaScript
 * sets it to the theme's `background` (`src/appContainer.tsx`, `NativeModules.WindowBackground`);
 * until it does, `android:windowBackground` of `styles.xml` (white, the theme's default) shows.
 *
 * The same module lets one screen draw under the bars (`setContentUnderBars`): the welcome screen
 * is a photo that has to reach the screen's four edges, so while it is shown the padding is off
 * (ContentInsets) and the bars' icons are light, over the photo's dark overlay.
 */
class WindowBackgroundPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(WindowBackgroundModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}

class WindowBackgroundModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  // The last color asked for: a recreated activity (a new font scale, a rotation) starts from the
  // style's color again, so it is painted again when the activity comes back.
  @Volatile private var color: Int? = null

  // The navigation bar's icon appearance before a screen went under the bars, put back when it leaves.
  private var lightNavigationIcons: Boolean? = null

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = "WindowBackground"

  /** `color` is what React Native's `processColor` gives for Android: the ARGB integer. */
  @ReactMethod
  fun setColor(color: Double) {
    this.color = color.toInt()
    paint()
  }

  /**
   * `true` while the screen shown draws under the status bar and the navigation bar: the content is
   * no longer padded by them (JavaScript keeps its own content inside the safe area) and the
   * navigation bar's icons are light. `false` puts both back as every other screen has them. The
   * status bar's icons are JavaScript's (`StatusBar`). Where the bars are not edge to edge (Android
   * 14 and earlier, 15 with the opt-out of `styles.xml`) the content view gets no bar insets, so
   * nothing changes there.
   */
  @ReactMethod
  fun setContentUnderBars(underBars: Boolean) {
    ContentInsets.underBars = underBars
    applyContentInsets()
  }

  private fun applyContentInsets() {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      val window = activity.window
      val controller = WindowCompat.getInsetsController(window, window.decorView)
      if (ContentInsets.underBars) {
        if (lightNavigationIcons == null) lightNavigationIcons = controller.isAppearanceLightNavigationBars
        controller.isAppearanceLightNavigationBars = false
      } else {
        lightNavigationIcons?.let { controller.isAppearanceLightNavigationBars = it }
        lightNavigationIcons = null
      }
      // The padding is read when the insets are applied: ask for it again.
      ViewCompat.requestApplyInsets(window.decorView.findViewById<View>(android.R.id.content))
    }
  }

  private fun paint() {
    val value = color ?: return
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread { activity.window.setBackgroundDrawable(ColorDrawable(value)) }
  }

  override fun onHostResume() {
    paint()
    // A recreated activity starts with the navigation bar's default icons.
    if (ContentInsets.underBars) applyContentInsets()
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() = Unit

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    super.invalidate()
  }
}
