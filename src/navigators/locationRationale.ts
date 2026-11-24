import { NativeModules } from 'react-native'

// The title and message of Android's location permission rationale: the two string resources
// the Builder rewrites per brand (`android/.../strings.xml`, read by the app's own `AppStrings`
// module). iOS has no such module and always uses the defaults; so does an Android build whose
// strings still hold their placeholders.
const TITLE_PLACEHOLDER = 'ALLOW_DRIVER_APP_ACCESS_LOCATION'
const MESSAGE_PLACEHOLDER = 'DESCRIPTION_DRIVER_APP_ACCESS_LOCATION'
const DEFAULT_TITLE = 'Allow Driver App to access this device\'s location even when closed or not in use?'
const DEFAULT_MESSAGE = 'This app collects location data for locate drivers, stores and customers'

const brandOrDefault = (value: string | undefined, placeholder: string, fallback: string) =>
  !value || value === placeholder ? fallback : value

export const locationRationale = () => {
  const strings = NativeModules.AppStrings
  return {
    title: brandOrDefault(strings?.driver_location_permission_title, TITLE_PLACEHOLDER, DEFAULT_TITLE),
    message: brandOrDefault(strings?.description_driver_location_permission, MESSAGE_PLACEHOLDER, DEFAULT_MESSAGE)
  }
}
