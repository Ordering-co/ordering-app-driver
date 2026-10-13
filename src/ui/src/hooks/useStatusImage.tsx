import { launchCamera } from 'react-native-image-picker';
import { useConfig, useLanguage, useToast, ToastType } from '@components';

const PHOTO_MAX_SIZE = 1280;
const PHOTO_QUALITY = 0.8;

export interface StatusImage {
  uri: string;
  type: string;
  name: string;
}

export const useStatusImage = () => {
  const [, t] = useLanguage();
  const [{ configs }] = useConfig();
  const [, { showToast }] = useToast();

  const statusesRequiringImage = configs?.states_requiring_image_driver?.value?.split('|') || [];

  const requiresImage = (status?: number) =>
    !!status && statusesRequiringImage.includes(status.toString());

  const captureImage = (): Promise<StatusImage | null> =>
    new Promise(resolve => {
      launchCamera(
        {
          mediaType: 'photo',
          saveToPhotos: true,
          cameraType: 'back',
          maxWidth: PHOTO_MAX_SIZE,
          maxHeight: PHOTO_MAX_SIZE,
          quality: PHOTO_QUALITY,
        },
        (response: any) => {
          if (response.didCancel) {
            resolve(null);
            return;
          }

          if (response.errorMessage) {
            showToast(ToastType.Error, response.errorMessage);
            resolve(null);
            return;
          }

          const image = response.assets?.[0];
          const imageType = image?.type?.toLowerCase();

          if (!image?.uri) {
            showToast(ToastType.Error, t('IMAGE_NOT_FOUND', 'Image not found'));
            resolve(null);
            return;
          }

          if (!['image/png', 'image/jpeg', 'image/jpg'].includes(imageType)) {
            showToast(ToastType.Error, t('UNSUPPORTED_IMAGE_TYPE', 'Unsupported image type'));
            resolve(null);
            return;
          }

          resolve({
            uri: image.uri,
            type: imageType,
            name: image.fileName || `image_${Date.now()}.${imageType === 'image/png' ? 'png' : 'jpg'}`,
          });
        },
      );
    });

  return { requiresImage, captureImage };
};
