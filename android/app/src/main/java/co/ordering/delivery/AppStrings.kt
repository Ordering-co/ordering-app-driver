package co.ordering.delivery

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.uimanager.ViewManager

/**
 * The two strings of `res/values/strings.xml` the location permission's rationale dialog shows
 * (`src/navigators/locationRationale.ts`). The Builder replaces their placeholder text per brand,
 * so they stay string resources; JavaScript reads them as `NativeModules.AppStrings`.
 */
class AppStringsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(AppStringsModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}

class AppStringsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppStrings"

  override fun getConstants(): Map<String, Any> = mapOf(
    "driver_location_permission_title" to reactApplicationContext.getString(R.string.driver_location_permission_title),
    "description_driver_location_permission" to reactApplicationContext.getString(R.string.description_driver_location_permission),
  )
}
