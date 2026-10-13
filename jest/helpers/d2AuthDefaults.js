/**
 * Controller defaults for auth UI wired exports (driver app).
 */
/* eslint-env jest */

const noop = () => {}

const loginFormDefaults = {
  navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  loginTab: 'email',
  formState: { loading: false, result: {} },
  useLoginByEmail: true,
  useLoginByCellphone: false,
  useLoginOtp: false,
  useLoginOtpEmail: false,
  useLoginOtpCellphone: false,
  handleChangeTab: noop,
  handleButtonLoginClick: jest.fn(),
  onNavigationRedirect: jest.fn(),
  enableReCaptcha: false,
  otpType: 'email',
  setOtpType: noop,
  generateOtpCode: jest.fn(),
  handleSendVerifyCode: jest.fn(),
  verifyPhoneState: { loading: false, result: {} },
  checkPhoneCodeState: { loading: false, result: {} },
  setCheckPhoneCodeState: jest.fn(),
  handleCheckPhoneCode: jest.fn(),
  allowedLevels: [4],
  useRootPoint: false,
  notificationState: { loading: false }
}

const forgotPasswordDefaults = {
  navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  formState: { loading: false, result: {} },
  handleButtonForgotPasswordClick: jest.fn()
}

const signupFormDefaults = {
  navigation: { navigate: jest.fn() },
  formState: { loading: false, result: { result: null, error: false } },
  validationFields: {
    loading: false,
    fields: {
      checkout: {
        email: { code: 'email', enabled: true, required: true, name: 'Email' },
        name: { code: 'name', enabled: true, required: true, name: 'Name' },
        password: { code: 'password', enabled: true, required: true, name: 'Password' }
      }
    }
  },
  showField: (code) => ['email', 'name', 'password'].includes(code),
  isRequiredField: (code) => code !== 'middle_name',
  useSignupByCellphone: false,
  handleButtonSignupClick: jest.fn(),
  handleSuccessSignup: jest.fn(),
  verifyPhoneState: { loading: false, result: {} },
  checkPhoneCodeState: { loading: false, result: {} },
  setCheckPhoneCodeState: jest.fn(),
  handleSendVerifyCode: jest.fn(),
  handleCheckPhoneCode: jest.fn(),
  signupLevel: 4
}

const sessionsDefaults = {
  navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  sessionsList: {
    loading: false,
    sessions: [
      { id: 1, created_at: '2026-01-01', valid_thru: '2026-12-31', current: true },
      { id: 2, created_at: '2026-02-01', valid_thru: '2026-12-31', current: false }
    ]
  },
  actionState: { loading: false },
  handleDeleteSession: jest.fn(),
  handleDeleteAllSessions: jest.fn()
}

const userFormDetailsDefaults = {
  isEdit: true,
  dontToggleEditMode: true,
  formState: { loading: false, changes: {}, result: { error: false } },
  validationFields: {
    loading: false,
    fields: {
      checkout: {
        name: { code: 'name', enabled: true, required: true, name: 'Name' },
        email: { code: 'email', enabled: true, required: true, name: 'Email' },
        password: { code: 'password', enabled: true, required: true, name: 'Password' }
      }
    }
  },
  showField: () => true,
  isRequiredField: () => true,
  cleanFormState: jest.fn(),
  handleChangeInput: jest.fn(),
  handleButtonUpdateClick: jest.fn(),
  handleCancelEdit: jest.fn(),
  onCloseProfile: jest.fn(),
  phoneUpdate: jest.fn(),
  isCheckout: false,
  allowDriverUpdateData: true
}

const userProfileDefaults = {
  ...userFormDetailsDefaults,
  isEdit: false,
  toggleIsEdit: jest.fn(),
  handleToggleAvalaibleStatusDriver: jest.fn(),
  handleRemoveAccount: jest.fn(),
  isShowDriverStatus: false,
  navigation: { navigate: jest.fn() },
  validationFields: {
    loading: false,
    error: null,
    fields: {
      checkout: {
        name: { code: 'name', enabled: true, required: true, name: 'Name' },
        email: { code: 'email', enabled: true, required: true, name: 'Email' }
      }
    }
  },
  userState: {
    loading: false,
    result: { error: false, result: { id: 1, email: 'user@test.com', name: 'Test User', level: 4 } }
  }
}

module.exports = {
  loginFormDefaults,
  forgotPasswordDefaults,
  signupFormDefaults,
  sessionsDefaults,
  userFormDetailsDefaults,
  userProfileDefaults
}
