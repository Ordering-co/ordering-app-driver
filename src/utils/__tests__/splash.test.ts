import BootSplash from 'react-native-bootsplash'
import { hideSplash } from '../splash'

describe('hideSplash', () => {
  it('hides the native splash with a fade', () => {
    hideSplash()
    expect(BootSplash.hide).toHaveBeenCalledWith({ fade: true })
  })

  it('does not throw when the native hide rejects', async () => {
    jest.mocked(BootSplash.hide).mockRejectedValueOnce(new Error('no splash'))
    expect(() => hideSplash()).not.toThrow()
    await Promise.resolve()
  })
})
