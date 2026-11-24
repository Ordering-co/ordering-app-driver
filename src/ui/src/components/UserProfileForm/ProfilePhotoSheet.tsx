import React, { useState } from 'react'

import { OAlertOriginal as OAlert, OBottomPopup, OListRow } from '../shared'
import { useLanguage } from '@components'

interface Props {
  open: boolean
  onClose: () => void
  onTakePhoto: () => void
  onChooseFromGallery: () => void
  /** The driver has a photo: only then is there one to remove. */
  hasPhoto?: boolean
  /** Removes the photo; asked once the driver has confirmed. */
  onRemovePhoto?: () => void
}

/**
 * What the driver can do with the profile photo, in the app's sheet (`OBottomPopup`): take a photo,
 * choose one from the gallery and, when there is a photo, remove it. Removing is the one choice that
 * loses something, so it asks first, as deleting a session does (`OAlertOriginal`, its accept button
 * named "Remove"): accepting closes the sheet and removes the photo, cancelling leaves the sheet as it was.
 */
export const ProfilePhotoSheet = ({ open, onClose, onTakePhoto, onChooseFromGallery, hasPhoto, onRemovePhoto }: Props) => {
  const [, t] = useLanguage()
  const [confirming, setConfirming] = useState(false)
  const canRemove = !!hasPhoto && !!onRemovePhoto

  const handleAccept = () => {
    setConfirming(false)
    onClose()
    onRemovePhoto?.()
  }

  return (
    <>
      <OBottomPopup open={open} onClose={onClose} title={t('PROFILE_PHOTO', 'Profile photo')} closeIcon padded transparent animationType='slide' testID='profile-photo-sheet'>
        <OListRow testID='photo-take' icon='camera-outline' title={t('TAKE_PHOTO', 'Take a photo')} chevron={false} onPress={onTakePhoto} />
        <OListRow testID='photo-gallery' icon='image-outline' title={t('CHOOSE_FROM_GALLERY', 'Choose from the gallery')} chevron={false} last={!canRemove} onPress={onChooseFromGallery} />
        {canRemove && (
          <OListRow testID='photo-remove' icon='trash-outline' title={t('REMOVE_PHOTO', 'Remove photo')} danger chevron={false} last onPress={() => setConfirming(true)} />
        )}
      </OBottomPopup>
      <OAlert
        open={confirming}
        title={t('WEB_APPNAME', 'Ordering')}
        content={[t('QUESTION_REMOVE_PHOTO', 'Are you sure that you want to remove your photo?')]}
        acceptText={t('REMOVE', 'Remove')}
        destructive
        onAccept={handleAccept}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}
