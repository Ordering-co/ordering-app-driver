import React from 'react'
import { render } from '@testing-library/react-native'

let mockConfigs: any = {}
jest.mock('@components', () => ({ useConfig: () => [{ configs: mockConfigs }] }))

import { usePhoneCountry } from '../usePhoneCountry'

let value: ReturnType<typeof usePhoneCountry>
const Probe = () => { value = usePhoneCountry(); return null }

describe('usePhoneCountry: the project\'s default country for a phone with no code', () => {
  it.each([[{ default_country_code: { value: 'US' } }, 'US'], [{ default_country_code: { value: '+57' } }, '+57'], [{ default_country_code: { value: 1 } }, '1']])('reads %j as %s', (configs, expected) => {
    mockConfigs = configs
    render(<Probe />)
    expect(value).toBe(expected)
  })

  it('is undefined when the project has none', () => {
    for (const configs of [{}, undefined, { default_country_code: { value: '' } }, { default_country_code: {} }]) {
      mockConfigs = configs
      render(<Probe />)
      expect(value).toBeUndefined()
    }
  })
})
