import { renderHook } from '@testing-library/react-native'
import { launchCamera } from 'react-native-image-picker'

jest.mock('@components', () => require('../../../../../jest/helpers/mockOrdering'))
jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn() }))

import { useStatusImage } from '../useStatusImage'

const photo = { uri: 'file:///proof.jpg', type: 'image/jpeg', fileName: 'proof.jpg' }
const answers = (response: any) => (launchCamera as jest.Mock).mockImplementation((_options: any, callback: any) => callback(response))

describe('useStatusImage: the proof photo', () => {
  beforeEach(() => (launchCamera as jest.Mock).mockReset())

  it('asks the back camera for a photo and does not save it to the driver\'s gallery', async () => {
    answers({ assets: [photo] })
    const { captureImage } = renderHook(() => useStatusImage()).result.current
    await captureImage()
    const options = (launchCamera as jest.Mock).mock.calls[0][0]
    expect(options).toEqual(expect.objectContaining({ mediaType: 'photo', cameraType: 'back', saveToPhotos: false }))
    expect(options.saveToPhotos).not.toBe(true)
  })

  it('hands the photo back to upload it with the order', async () => {
    answers({ assets: [photo] })
    const { captureImage } = renderHook(() => useStatusImage()).result.current
    await expect(captureImage()).resolves.toEqual({ uri: photo.uri, type: 'image/jpeg', name: 'proof.jpg' })
  })

  it('gives nothing back when the driver cancels', async () => {
    answers({ didCancel: true })
    const { captureImage } = renderHook(() => useStatusImage()).result.current
    await expect(captureImage()).resolves.toBeNull()
  })
})
