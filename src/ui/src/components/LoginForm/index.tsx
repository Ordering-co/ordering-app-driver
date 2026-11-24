import React, { useEffect, useMemo, useState, useRef } from 'react';
import { StyleSheet, Keyboard, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Recaptcha from 'react-native-recaptcha-that-works'
import { RecaptchaV3 } from '../RecaptchaV3'
import { useTheme } from 'styled-components/native';

import { LoginParams } from '../../types';
import { _setStoreData } from '../../providers/StoreUtil'
import { apiErrorText } from '../../utils'
import { Otp } from './Otp'
import { AUTH_FIELD_SCOPE, AuthAction, AuthScreen, RecaptchaCheckbox, useAuthStyles, useUntilEdited } from './AuthPieces'
import {
  FieldError,
  OLink,
  ONotice,
  PasswordToggle,
  OText,
  OButton,
  OInput,
  OModal,
  OAlertOriginal as Alert,
  ODivider,
  Tabs,
} from '../shared'
import { themeControlHeight, themePart, themeSpace, themeVisible } from '@/theme/helpers'

import {
  LoginForm as LoginFormController,
  useLanguage,
  useConfig,
  useApi
} from '@components';

import { PhoneInputNumber } from '../PhoneInputNumber'
import { VerifyPhone } from '../VerifyPhone'

/**
 * The login form: `components.auth_form` of the theme, on the auth screen (the bar over a scroll with the
 * form, and the main action pinned under it). Its login methods are the `method_tabs` slot, its fields the
 * theme's input with the label above, the message of a field under it (`FieldError`) and the ones that
 * belong to no field (the server's answer, the reCAPTCHA's retry) a notice that stays until the driver
 * edits. The password's eye is the app's `PasswordToggle`, and the forgot password link is hidden by
 * `auth.forgot_password_link`.
 *
 * The ways in are the controller's (it reads the project's configs): e-mail and password, phone and password, a
 * code by e-mail, a code by phone (SMS, and WhatsApp when the project has it). One tab each, in that order, shown
 * only when two or more are on; the controller says which one is selected first.
 */
type LoginValues = { email: string; password: string };

/** Up to this many tabs share the row; more of them scroll sideways, out to the screen's edge (as the orders' tabs). */
const MAX_TABS_SHARING_ROW = 3
/** The channels the controller's `generateOtpCode` takes for a code to a phone: an SMS, a WhatsApp message. */
const OTP_CHANNEL_SMS = 2
const OTP_CHANNEL_WHATSAPP = 4

/** The first message of a result that failed: the server answers a text or a list of them. */
const messageOf = (state: any): string | null => {
  if (!state || state.loading || !state.result?.error || !state.result?.result) return null
  const { result } = state.result
  return (typeof result === 'string' ? result : result[0]) ?? null
}

const LoginFormUI = (props: LoginParams) => {
  const {
    navigation,
    formState,
    handleButtonLoginClick,
    onNavigationRedirect,
    loginTab,
    useLoginByCellphone,
    useLoginByEmail,
    handleSendVerifyCode,
    verifyPhoneState,
    checkPhoneCodeState,
    handleCheckPhoneCode,
    setCheckPhoneCodeState,
    useRootPoint,
    handleReCaptcha,
    enableReCaptcha,

    useLoginOtp,
    otpType,
    setOtpType,
    generateOtpCode,
    useLoginOtpEmail,
    useLoginOtpCellphone,
    useLoginOtpWhatsapp,
  } = props;

  const [ordering, { setOrdering }] = useApi();
  const [, t] = useLanguage();
  const theme: any = useTheme();
  const authStyles = useAuthStyles();
  const [{ configs }] = useConfig();
  const { control, handleSubmit, clearErrors, formState: { errors } } = useForm<LoginValues>();

  const inputRef = useRef<any>(null);
  const inputMailRef = useRef<any>(null);

  const [projectName, setProjectName] = useState({ name: '', isFocued: false });
  const [passwordSee, setPasswordSee] = useState(false);
  const [isLoadingVerifyModal, setIsLoadingVerifyModal] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneInputData, setPhoneInputData] = useState({
    error: '',
    phone: {
      country_phone_code: null,
      cellphone: null,
    },
  });
  // The phone field was left empty where it is needed (its own message is the invalid number's).
  const [phoneMissing, setPhoneMissing] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formValues, setFormValues] = useState(null);

  const [recaptchaConfig, setRecaptchaConfig] = useState<any>({})
  const [recaptchaVerified, setRecaptchaVerified] = useState(false)
  // The check cannot open: the project has no site key or no base url.
  const [recaptchaError, setRecaptchaError] = useState('')

  const recaptchaRef = useRef<any>({});

  const [willVerifyOtpState, setWillVerifyOtpState] = useState(false)
  const [alertState, setAlertState] = useState({ open: false, title: '', content: [] })

  // The channel of the code the phone's OTP asks for; the code screen's resend asks again by the same one.
  const otpChannelRef = useRef(OTP_CHANNEL_SMS)

  // What each field shows, as before: the e-mail with its tab (or the e-mail OTP), the phone with its tab
  // (or the phone OTP), the password on every tab but the OTP's.
  const emailShown = (useLoginByEmail && loginTab === 'email') || (loginTab === 'otp' && otpType === 'email')
  const phoneShown = (useLoginByCellphone && loginTab === 'cellphone') || (loginTab === 'otp' && otpType === 'cellphone')
  const passwordShown = loginTab !== 'otp'
  // One tab per way in that the project has on, always in this order. The two OTP ones are the controller's `otp` tab
  // with its `otpType`, so each has a key of its own here.
  const tabs = [
    useLoginByEmail && { key: 'email', text: t('EMAIL', 'Email') },
    useLoginByCellphone && { key: 'cellphone', text: t('PHONE', 'Phone') },
    useLoginOtpEmail && { key: 'otp-email', text: t('OTP_EMAIL', 'OTP Email') },
    useLoginOtpCellphone && { key: 'otp-cellphone', text: t('OTP_PHONE', 'OTP Phone') },
  ].filter(Boolean).map((tab: any) => ({ ...tab, testID: `login-tab-${tab.key}` }))
  const selectedTab = loginTab === 'otp' ? `otp-${otpType}` : loginTab
  // With one way alone there is nothing to choose.
  const tabsShown = tabs.length > 1
  const tabsFill = tabs.length <= MAX_TABS_SHARING_ROW
  const otpPhoneShown = loginTab === 'otp' && otpType === 'cellphone'
  const whatsappShown = otpPhoneShown && !!useLoginOtpWhatsapp
  const methodsShown = !!(useLoginByCellphone || useLoginByEmail || useLoginOtp)
  const smsShown = !!useLoginByCellphone &&
    loginTab === 'cellphone' &&
    !!configs &&
    Object.keys(configs).length > 0 &&
    (configs?.twilio_service_enabled?.value === 'true' || configs?.twilio_service_enabled?.value === '1')

  // The notices of what belongs to no field: the server's answer to the login, to the code request.
  const formMessage = messageOf(formState)
  const [formNotice, clearFormNotice] = useUntilEdited(
    formState,
    formMessage === null
      ? null
      : formState?.result?.result?.[0] === 'ERROR_AUTH_VERIFICATION_CODE'
        ? { variant: 'info' as const, text: t('TRY_AGAIN', 'Please try again') }
        : { variant: 'danger' as const, text: apiErrorText(formMessage, t) }
  )
  const verifyMessage = messageOf(verifyPhoneState)
  const [verifyNotice, clearVerifyNotice] = useUntilEdited(
    verifyPhoneState,
    verifyMessage === null ? null : { variant: 'danger' as const, text: apiErrorText(verifyMessage, t) }
  )
  const clearNotices = () => {
    clearFormNotice()
    clearVerifyNotice()
  }

  const phoneRequiredMessage = t('VALIDATION_ERROR_MOBILE_PHONE_REQUIRED', 'The field Mobile phone is required.')
  const isPhoneEmpty = !phoneInputData.error && !phoneInputData.phone.country_phone_code && !phoneInputData.phone.cellphone

  const handleOpenRecaptcha = () => {
    setRecaptchaVerified(false)
    if (!recaptchaConfig?.siteKey) {
      setRecaptchaError(t('NO_RECAPTCHA_SITE_KEY', 'The config doesn\'t have recaptcha site key'));
      return
    }
    if (!recaptchaConfig?.baseUrl) {
      setRecaptchaError(t('NO_RECAPTCHA_BASE_URL', 'The config doesn\'t have recaptcha base url'));
      return
    }
    setRecaptchaError('')
    recaptchaRef.current.open()
  }

  const onRecaptchaVerify = (token: any) => {
    setRecaptchaVerified(true)
    handleReCaptcha({ code: token, version: recaptchaConfig?.version })
  }

  useEffect(() => {
    if (configs && Object.keys(configs).length > 0 && enableReCaptcha) {
      if (configs?.security_recaptcha_type?.value === 'v3' &&
        configs?.security_recaptcha_score_v3?.value > 0 &&
        configs?.security_recaptcha_site_key_v3?.value
      ) {
        setRecaptchaConfig({
          version: 'v3',
          siteKey: configs?.security_recaptcha_site_key_v3?.value || null,
          baseUrl: configs?.security_recaptcha_base_url?.value || null
        })
        return
      }
      if (configs?.security_recaptcha_site_key?.value) {
        setRecaptchaConfig({
          version: 'v2',
          siteKey: configs?.security_recaptcha_site_key?.value || null,
          baseUrl: configs?.security_recaptcha_base_url?.value || null
        })
      }
    }
  }, [configs, enableReCaptcha])

  useEffect(() => {
    const projectInputInterval = setInterval(() => {
      if (projectName.name && useRootPoint && projectName.isFocued) {
        setOrdering({
          ...ordering,
          project: projectName.name
        })
      }
    }, 1500)
    return () => clearInterval(projectInputInterval);
  }, [projectName])

  const handleChangeTab = (val: string) => {
    setPhoneInputData({ ...phoneInputData, error: '' });
    setPhoneMissing('');
    setRecaptchaError('');
    clearNotices();
    // The other tab's red fields and messages do not follow the driver to this one.
    clearErrors();
    props.handleChangeTab(val);
  };

  const handleChangeInputEmail = (value: string, onChange: any) => {
    clearNotices();
    onChange(value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''));
  };

  const handleLogin = () => {
    setLoading(true);
    // Both the form's fields and the phone's are checked at once, so each shows what it lacks.
    const missing = phoneShown && isPhoneEmpty;
    setPhoneMissing(missing ? phoneRequiredMessage : '');
    handleSubmit((values) => {
      if (!missing) onSubmit(values);
    })();
  };

  const mainLogin = (values: any) => {
    if (loginTab === 'otp') {
      if (phoneInputData.error && (loginTab !== 'otp' || (otpType === 'cellphone' && loginTab === 'otp'))) {
        return
      }
      if (loginTab === 'otp') {
        generateOtpCode({
          ...values,
          ...phoneInputData.phone
        }, otpChannelRef.current)
      }
      setWillVerifyOtpState(true)
    } else {
      if (phoneInputData.error) {
        return;
      }
      handleButtonLoginClick({
        ...values,
        ...phoneInputData.phone,
      });
    }
  }

  const onSubmit = (values: any) => {
    // The request goes with the keyboard closed (a failed check keeps it, to fix the field).
    Keyboard.dismiss();

    if (phoneInputData.error) {
      return;
    }

    if (values?.project_name) {
      setOrdering({
        ...ordering,
        project: values?.project_name
      })
      _setStoreData('project_name', values?.project_name)
      setFormValues({ ...values, ...phoneInputData.phone })
      setSubmitted(true)
      return
    }
    mainLogin(values)
  };
  const handleChangeOtpType = (type: string) => {
    handleChangeTab('otp')
    setOtpType(type)
  }

  const handleSelectTab = (key: string) => {
    if (key === 'otp-email') handleChangeOtpType('email')
    else if (key === 'otp-cellphone') handleChangeOtpType('cellphone')
    else handleChangeTab(key)
  }

  // The code goes by the channel of the button that asked for it (the pinned action is the SMS).
  const handleSendOtp = (channel: number) => {
    otpChannelRef.current = channel
    handleLogin()
  }

  const handleLoginOtp = (code: string) => {
    handleButtonLoginClick({ code })
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      title: '',
      content: []
    })
  }

  const handleVerifyCodeClick = () => {
    if (phoneInputData.error) {
      return;
    }

    if (isPhoneEmpty) {
      setPhoneMissing(phoneRequiredMessage);
      return;
    }

    handleSendVerifyCode && handleSendVerifyCode(phoneInputData.phone);
    setIsLoadingVerifyModal(true);
  };

  useEffect(() => {
    if (!formState?.loading && formState?.result?.error) {
      if (formState.result?.result?.[0] === 'ERROR_AUTH_VERIFICATION_CODE') {
        setRecaptchaVerified(false)
        setSubmitted(false)
        setRecaptchaConfig({
          version: 'v2',
          siteKey: configs?.security_recaptcha_site_key?.value || null,
          baseUrl: configs?.security_recaptcha_base_url?.value || null
        })
        return
      }
      setSubmitted(false)
    }
    if (!formState?.loading && !formState?.result?.error) {
      setWillVerifyOtpState(false)
    }
  }, [formState]);

  useEffect(() => {
    if (verifyPhoneState && !verifyPhoneState?.loading) {
      if (verifyPhoneState.result?.error) {
        setIsLoadingVerifyModal(false);
        return;
      }

      const okResult = verifyPhoneState.result?.result === 'OK';
      if (okResult) {
        !isModalVisible && setIsModalVisible(true);
        setIsLoadingVerifyModal(false);
      }
    }
  }, [verifyPhoneState]);

  useEffect(() => {
    if (loading && !formState?.loading) {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (ordering.project === null || !submitted || !useRootPoint) return
    const values: any = formValues
    if (values?.project_name) {
      delete values.project_name
    }
    mainLogin(values)
    setSubmitted(false)
  }, [ordering, submitted])

  useEffect(() => {
    const { error, result } = checkPhoneCodeState?.result ?? {}
    if (!error) return
    setAlertState({
      open: true,
      title: t('ERROR', 'Error'),
      content: result ?? (typeof error === 'string' ? error : [])
    })
  }, [checkPhoneCodeState])

  // The pieces the theme's slots say: the login methods' tabs.
  const tabsSlot = themePart(theme, 'auth_form', 'slots.method_tabs');
  const submitSlot = themePart(theme, 'auth_form', 'slots.submit');
  const styles = useMemo(() => StyleSheet.create({
    start: { alignSelf: 'flex-start' },
    // The room of the invisible reCAPTCHA v3 check (a WebView).
    recaptchaV3: { height: themeControlHeight(theme, 'md') },
    verify: { gap: themeSpace(theme, 'md') },
    or: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md') },
    line: { flex: 1 },
  }), [theme]);

  return (
    <>
      <AuthScreen
        title={t('LOGIN', 'Login')}
        onBack={() => navigation?.canGoBack() && navigation.goBack()}
        footer={methodsShown && (
          <AuthAction
            testID='login-submit'
            onPress={() => handleSendOtp(OTP_CHANNEL_SMS)}
            text={loginTab !== 'otp'
              ? t('LOGIN', 'Login')
              : whatsappShown ? t('SEND_BY_SMS', 'Send by SMS') : t('GET_VERIFY_CODE', 'Get verify code')}
            loading={formState?.loading || loading}
          />
        )}
      >
        {[formNotice, verifyNotice].map((notice, i) => notice && (
          <ONotice key={i} variant={notice.variant} testID='login-notice'>{notice.text}</ONotice>
        ))}

        {tabsShown && (
          <View testID='login-tabs'>
            <Tabs
              fill={tabsFill}
              // Four tabs share the row too when they fit; they scroll (out to the screen's edge) only when they do not.
              fitFill={!tabsFill}
              testID='login-tabs-strip'
              endGutter
              tabs={tabs}
              selected={selectedTab as string}
              size={tabsSlot.size}
              variant={tabsSlot.variant ?? undefined}
              onChange={handleSelectTab}
            />
          </View>
        )}

        {methodsShown && (
          <View style={authStyles.fields}>
            {emailShown && (
              <View>
                <Controller
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <OInput
                      scope={AUTH_FIELD_SCOPE}
                      placeholder={t('EMAIL', 'Email')}
                      hasError={!!errors?.email}
                      onChange={(e: any) => {
                        setProjectName({ ...projectName, isFocued: false })
                        handleChangeInputEmail(e, onChange);
                      }}
                      value={value}
                      autoCapitalize="none"
                      autoCorrect={false}
                      type="email-address"
                      autoCompleteType="email"
                      forwardRef={inputMailRef}
                      returnKeyType="next"
                      onSubmitEditing={() => inputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  )}
                  name="email"
                  rules={{
                    required: t(
                      'VALIDATION_ERROR_EMAIL_REQUIRED',
                      'The field Email is required',
                    ).replace('_attribute_', t('EMAIL', 'Email')),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: t(
                        'INVALID_ERROR_EMAIL',
                        'Invalid email address',
                      ).replace('_attribute_', t('EMAIL', 'Email')),
                    },
                  }}
                  defaultValue=""
                />
                {!!errors?.email && (
                  <FieldError scope={AUTH_FIELD_SCOPE} testID='error-email'>{errors.email.message}</FieldError>
                )}
              </View>
            )}

            {phoneShown && (
              <PhoneInputNumber
                scope={AUTH_FIELD_SCOPE}
                data={{ ...phoneInputData, error: phoneInputData.error || phoneMissing }}
                handleData={(val: any) => {
                  setPhoneMissing('');
                  clearNotices();
                  setPhoneInputData(val);
                }}
                onSubmitEditing={() => null}
                textInputProps={{
                  returnKeyType: 'next',
                  onSubmitEditing: () => inputRef?.current?.focus?.(),
                }}
              />
            )}

            {passwordShown && (
              <View>
                <Controller
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <OInput
                      scope={AUTH_FIELD_SCOPE}
                      isSecured={!passwordSee ? true : false}
                      placeholder={t('PASSWORD', 'Password')}
                      hasError={!!errors?.password}
                      iconCustomRight={
                        <PasswordToggle scope={AUTH_FIELD_SCOPE} visible={passwordSee} onToggle={() => setPasswordSee(!passwordSee)} />
                      }
                      value={value}
                      forwardRef={inputRef}
                      onChange={(val: any) => {
                        clearNotices();
                        onChange(val);
                      }}
                      returnKeyType="done"
                      onSubmitEditing={() => handleLogin()}
                      blurOnSubmit
                    />
                  )}
                  name="password"
                  rules={{
                    required: t(
                      'VALIDATION_ERROR_PASSWORD_REQUIRED',
                      'The field Password is required',
                    ).replace('_attribute_', t('PASSWORD', 'Password')),
                  }}
                  defaultValue=""
                />
                {!!errors?.password && (
                  <FieldError scope={AUTH_FIELD_SCOPE} testID='error-password'>{errors.password.message}</FieldError>
                )}
              </View>
            )}

            {onNavigationRedirect && passwordShown && themeVisible(theme, 'auth.forgot_password_link') && (
              <View style={styles.start}>
                <OLink
                  shorcut={t('FORGOT_YOUR_PASSWORD', 'Forgot your password?')}
                  onPress={() => onNavigationRedirect('Forgot')}
                />
              </View>
            )}
            {(enableReCaptcha && recaptchaConfig?.version) && (
              <>
                {recaptchaConfig?.version === 'v3' ? (
                  <RecaptchaV3
                    url={recaptchaConfig?.baseUrl}
                    siteKey={recaptchaConfig?.siteKey}
                    containerStyle={styles.recaptchaV3}
                    onExecute={onRecaptchaVerify}
                  />
                ) : (
                  <View>
                    <RecaptchaCheckbox
                      checked={recaptchaVerified}
                      onPress={handleOpenRecaptcha}
                      label={t('VERIFY_ReCAPTCHA', 'Verify reCAPTCHA')}
                    />
                    {!!recaptchaError && (
                      <FieldError scope={AUTH_FIELD_SCOPE} testID='error-recaptcha'>{recaptchaError}</FieldError>
                    )}
                    <Recaptcha
                      ref={recaptchaRef}
                      siteKey={recaptchaConfig?.siteKey}
                      baseUrl={recaptchaConfig?.baseUrl}
                      onVerify={onRecaptchaVerify}
                      onExpire={() => setRecaptchaVerified(false)}
                    />
                  </View>)
                }
              </>
            )}
          </View>
        )}

        {whatsappShown && (
          <OButton
            onClick={() => handleSendOtp(OTP_CHANNEL_WHATSAPP)}
            text={t('SEND_BY_WHATSAPP', 'Send by WhatsApp')}
            color={submitSlot.color}
            appearance='outline'
            size={submitSlot.size}
            loading={formState?.loading || loading}
          />
        )}

        {smsShown && (
          <View style={styles.verify}>
            <View style={styles.or}>
              <View style={styles.line}><ODivider /></View>
              <OText>{t('OR', 'Or')}</OText>
              <View style={styles.line}><ODivider /></View>
            </View>

            {/* An outline button, as its call always asked (it painted filled). */}
            <OButton
              onClick={handleVerifyCodeClick}
              text={t('GET_VERIFY_CODE', 'Get Verify Code')}
              color={submitSlot.color}
              appearance='outline'
              size={submitSlot.size}
              loading={isLoadingVerifyModal}
            />
          </View>
        )}
      </AuthScreen>

      <OModal
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        entireModal
        customClose
      >
        <VerifyPhone
          phone={phoneInputData.phone}
          verifyPhoneState={verifyPhoneState}
          checkPhoneCodeState={checkPhoneCodeState}
          handleCheckPhoneCode={handleCheckPhoneCode}
          setCheckPhoneCodeState={setCheckPhoneCodeState}
          handleVerifyCodeClick={handleVerifyCodeClick}
          onClose={() => setIsModalVisible(false)}
        />
      </OModal>
      <OModal
        open={willVerifyOtpState}
        onClose={() => setWillVerifyOtpState(false)}
        entireModal
        customClose
      >
        {willVerifyOtpState && (
          <Otp
            willVerifyOtpState={willVerifyOtpState}
            setWillVerifyOtpState={setWillVerifyOtpState}
            handleLoginOtp={handleLoginOtp}
            onSubmit={handleLogin}
            setAlertState={setAlertState}
            formState={formState}
            isAlertOpen={alertState.open}
          />
        )}
      </OModal>
      <Alert
        open={alertState.open}
        notice
        content={alertState.content}
        title={alertState.title || ''}
        onAccept={closeAlert}
        onClose={closeAlert}
      />
    </>
  );
};

export const LoginForm = (props: any) => {
  const loginProps = {
    ...props,
    isRecaptchaEnable: true,
    UIComponent: LoginFormUI,
  };

  return <LoginFormController {...loginProps} />;
};
