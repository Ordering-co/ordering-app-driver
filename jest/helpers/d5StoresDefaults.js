/**
 * Controller defaults for PhoneInputNumber (driver app).
 */
/* eslint-env jest */

const phoneInputNumberDefaults = {
  data: { error: '', phone: { country_phone_code: null, cellphone: null } },
  handleData: jest.fn(),
  defaultValue: '',
  defaultCode: 1,
  forwardRef: null,
  textInputProps: {},
  onSubmitEditing: jest.fn()
}

const phoneInputNumberWithErrorDefaults = {
  ...phoneInputNumberDefaults,
  data: {
    error: 'The Phone Number field is invalid',
    phone: { country_phone_code: null, cellphone: null }
  }
}

module.exports = {
  phoneInputNumberDefaults,
  phoneInputNumberWithErrorDefaults
}
