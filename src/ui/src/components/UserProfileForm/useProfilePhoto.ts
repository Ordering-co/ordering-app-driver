import { launchCamera, launchImageLibrary } from 'react-native-image-picker'
import { useLanguage, useToast, ToastType } from '@components'

/** The picture's side (px): a profile photo is small, and it travels as base64 in the user's save. */
const PHOTO_MAX_SIZE = 200

const PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  maxHeight: PHOTO_MAX_SIZE,
  maxWidth: PHOTO_MAX_SIZE,
  includeBase64: true,
}

/**
 * The two ways to give the profile a photo: the camera and the gallery. Each one hands the picture, as
 * the data URL the user's save takes, to `onPicked`; `onDone` is called when the picker returns for any
 * reason (a picture, a cancel, an error), so the sheet that asked can close. A cancel says nothing; an
 * error of the picker or a response with no picture is a toast. The picker's response carries
 * `didCancel` and `errorMessage` at its root, with the pictures in `assets`.
 *
 * Android needs no permission for either: the camera is the system's own app (the library asks it
 * through an intent), unless the app's manifest declares `CAMERA`, which it does not.
 */
export const useProfilePhoto = ({ onPicked, onDone }: { onPicked: (dataUrl: string) => void, onDone?: () => void }) => {
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()

  const handleResponse = (response: any) => {
    onDone?.()
    if (response?.didCancel) return
    if (response?.errorMessage) {
      showToast(ToastType.Error, response.errorMessage)
      return
    }
    const picture = response?.assets?.[0]
    if (picture?.uri) {
      onPicked(`data:${picture.type};base64,${picture.base64}`)
      return
    }
    showToast(ToastType.Error, t('IMAGE_NOT_FOUND', 'Image not found'))
  }

  return {
    takePhoto: () => launchCamera({ ...PICKER_OPTIONS, cameraType: 'front' }, handleResponse),
    chooseFromGallery: () => launchImageLibrary(PICKER_OPTIONS, handleResponse),
  }
}
