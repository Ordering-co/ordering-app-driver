import React, { useEffect, useState, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Keyboard,
  View,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Recaptcha from 'react-native-recaptcha-that-works'
import ReCaptcha from '@fatnlazycat/react-native-recaptcha-v3'
import { TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import {
  LoginWith,
  ButtonsWrapper,
  FormInput,
  TabsContainer,
  OrSeparator,
  LineSeparator,
  RecaptchaButton
} from './styles';

import { LoginParams } from '../../types';
import { _setStoreData } from '../../providers/StoreUtil'
import { Otp } from './Otp'

import {
  ToastType,
  useToast,
  LoginForm as LoginFormController,
  useLanguage,
  useConfig,
  useApi
} from '@components';

import {
  OText, OButton, OInput, OModal,
  PhoneInputNumber,
  VerifyPhone,
  OAlertOriginal as Alert,
  ONavbar
} from '@ui'

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
    allowedLevels,
    useRootPoint,
    notificationState,
    handleReCaptcha,
    enableReCaptcha,

    useLoginOtp,
    otpType,
    setOtpType,
    generateOtpCode,
    useLoginOtpEmail,
    useLoginOtpCellphone,
  } = props;

  const [ordering, { setOrdering }] = useApi();
  const [, { showToast }] = useToast();
  const [, t] = useLanguage();
  const theme = useTheme();
  const [{ configs }] = useConfig();
  const { control, handleSubmit, errors, clearErrors } = useForm();

  const scrollRefTab = useRef<ScrollView | null>(null);
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
  const [submitted, setSubmitted] = useState(false);
  const [formValues, setFormValues] = useState(null);

  const [recaptchaConfig, setRecaptchaConfig] = useState<any>({})
  const [recaptchaVerified, setRecaptchaVerified] = useState(false)

  const recaptchaRef = useRef<any>({});

  const [willVerifyOtpState, setWillVerifyOtpState] = useState(false)
  const [alertState, setAlertState] = useState({ open: false, title: '', content: [] })
  const isOtpEmail = loginTab === 'otp' && otpType === 'email'

  const tabs = [{
    label: t('EMAIL', 'Email'),
    value: 'email'
  }, {
    label: t('OTP_EMAIL', 'OTP Email'),
    value: 'otp'
  }]
  const handleOpenRecaptcha = () => {
    setRecaptchaVerified(false)
    if (!recaptchaConfig?.siteKey) {
      showToast(ToastType.Error, t('NO_RECAPTCHA_SITE_KEY', 'The config doesn\'t have recaptcha site key'));
      return
    }
    if (!recaptchaConfig?.baseUrl) {
      showToast(ToastType.Error, t('NO_RECAPTCHA_BASE_URL', 'The config doesn\'t have recaptcha base url'));
      return
    }
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
    clearErrors([val]);
    props.handleChangeTab(val);

    if (loginTab === 'email') {
      scrollRefTab?.current?.scrollToEnd && scrollRefTab.current?.scrollToEnd({ animated: true });
    }

    if (loginTab === 'cellphone') {
      scrollRefTab?.current?.scrollTo && scrollRefTab.current?.scrollTo({ animated: true });
    }
  };

  const handleChangeInputEmail = (value: string, onChange: any) => {
    onChange(value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''));
  };

  const handleLogin = () => {
    setLoading(true);

    handleSubmit(onSubmit)();
  };

  const mainLogin = (values: any) => {
    if (loginTab === 'otp') {
      if (phoneInputData.error && (loginTab !== 'otp' || (otpType === 'cellphone' && loginTab === 'otp'))) {
        showToast(ToastType.Error, t('INVALID_PHONE_NUMBER', 'Invalid phone number'));
        return
      }
      if (loginTab === 'otp') {
        generateOtpCode({
          ...values,
          ...phoneInputData.phone
        })
      }
      setWillVerifyOtpState(true)
    } else {
      if (phoneInputData.error) {
        showToast(ToastType.Error, phoneInputData.error);
        return;
      }
      handleButtonLoginClick({
        ...values,
        ...phoneInputData.phone,
      });
    }
  }

  const onSubmit = (values: any) => {
    Keyboard.dismiss();

    if (phoneInputData.error) {
      showToast(ToastType.Error, phoneInputData.error);
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
      showToast(ToastType.Error, phoneInputData.error);
      return;
    }

    if (
      !phoneInputData.error &&
      !phoneInputData.phone.country_phone_code &&
      !phoneInputData.phone.cellphone
    ) {
      showToast(
        ToastType.Error,
        t(
          'VALIDATION_ERROR_MOBILE_PHONE_REQUIRED',
          'The field Mobile phone is required.',
        ),
      );
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
        showToast(ToastType.Info, t('TRY_AGAIN', 'Please try again'))
        return
      }
      formState.result?.result && showToast(
        ToastType.Error,
        typeof formState.result?.result === 'string'
          ? formState.result?.result
          : formState.result?.result[0]
      )
      setSubmitted(false)
    }
    if (!formState?.loading && !formState?.result?.error) {
      setWillVerifyOtpState(false)
    }
  }, [formState]);

  useEffect(() => {
    if (verifyPhoneState && !verifyPhoneState?.loading) {
      if (verifyPhoneState.result?.error) {
        const message =
          typeof verifyPhoneState?.result?.result === 'string'
            ? verifyPhoneState?.result?.result
            : verifyPhoneState?.result?.result[0];
        verifyPhoneState.result?.result && showToast(ToastType.Error, message);
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
    if (Object.keys(errors).length > 0) {
      // Convert all errors in one string to show in toast provider
      const list = Object.values(errors);
      let stringError = '';

      if (phoneInputData.error) {
        list.unshift({ message: phoneInputData.error });
      }

      if (
        loginTab === 'cellphone' &&
        !phoneInputData.error &&
        !phoneInputData.phone.country_phone_code &&
        !phoneInputData.phone.cellphone
      ) {
        list.unshift({
          message: t(
            'VALIDATION_ERROR_MOBILE_PHONE_REQUIRED',
            'The field Mobile phone is required.',
          ),
        });
      }

      list.map((item: any, i: number) => {
        stringError +=
          i + 1 === list.length ? `- ${item.message}` : `- ${item.message}\n`;
      });

      showToast(ToastType.Error, stringError);
    }
  }, [errors]);

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

  const styles = StyleSheet.create({
    container: {
      paddingBottom: 40,
      width: '100%',
    },
    header: {
      width: '100%',
      alignItems: 'center',
      flexDirection: 'row',
      position: 'relative',
    },
    arrowLeft: {
      marginRight: 10,
      position: 'absolute',
      top: -20,
      left: -20,
    },
    title: {
      fontStyle: 'normal',
      fontWeight: '600',
      fontSize: 26,
      color: theme.colors.textGray,
    },
    btnTab: {
      flex: 1,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnTabText: {
      fontSize: 16,
      fontFamily: theme.fonts.primary.name,
    },
    input: {
      color: theme.colors.unselectText,
      marginBottom: 20,
      borderWidth: 1,
      borderRadius: 10,
      borderColor: theme.colors.inputSignup,
      backgroundColor: theme.colors.transparent,
      minHeight: 50,
      maxHeight: 50,
      fontWeight: '400',
      fontFamily: theme.fonts.primary.name,
    },
    btnFlag: {
      width: 79,
      borderWidth: 1,
      borderRadius: 7.6,
      marginRight: 9,
      borderColor: theme.colors.inputSignup,
    },
    textForgot: {
      color: theme.colors.primary,
      fontWeight: '400',
      fontSize: 16,
      fontFamily: theme.fonts.primary.name,
    },

    borderStyleBase: {
      width: 30,
      height: 45
    },
    borderStyleHighLighted: {
      borderColor: "#03DAC6",
    },
    underlineStyleBase: {
      width: 45,
      height: 60,
      borderWidth: 1,
      fontSize: 16
    },
    underlineStyleHighLighted: {
      borderColor: theme.colors.primary,
      color: theme.colors.primary,
      fontSize: 16
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center'
    },

  });

  return (
    <View style={styles.container}>
      <ONavbar title={t('LOGIN', 'Login')} onBack={() => navigation?.canGoBack() && navigation.goBack()} />

      {(Number(useLoginByEmail) + Number(useLoginOtpEmail)) && (
        <LoginWith>
          <TabsContainer>
            {tabs.map((tab: any, index: number) => (
              <Pressable
                key={tab.value}
                style={{
                  ...styles.btnTab,
                  backgroundColor: loginTab === tab.value ? theme.colors.secondary : theme.colors.gray100,
                  borderTopLeftRadius: index === 0 ? 10 : 0,
                  borderBottomLeftRadius: index === 0 ? 10 : 0,
                  borderTopRightRadius: index === tabs.length -  1 ? 10 : 0,
                  borderBottomRightRadius: index === tabs.length - 1 ? 10 : 0,
                }}
                onPress={() => tab.value === 'otp' ? handleChangeOtpType('email') : handleChangeTab(tab.value)}>
                <OText
                  style={styles.btnTabText}
                  color={
                    loginTab === tab.value
                      ? theme.colors.primary
                      : theme.colors.unselectText
                  }
                  weight={loginTab === tab.value ? '600' : 'normal'}>
                  {tab.label}
                </OText>
              </Pressable>
            ))}
          </TabsContainer>
        </LoginWith>
      )}

      {(useLoginByCellphone || useLoginByEmail || useLoginOtp) && (
        <FormInput>
          {((useLoginByEmail && loginTab === 'email') || (loginTab === 'otp' && otpType === 'email')) && (
            <Controller
              control={control}
              render={({ onChange, value }: any) => (
                <OInput
                  placeholder={t('EMAIL', 'Email')}
                  placeholderTextColor={theme.colors.unselectText}
                  style={styles.input}
                  onChange={(e: any) => {
                    setProjectName({ ...projectName, isFocued: false })
                    handleChangeInputEmail(e, onChange);
                  }}
                  selectionColor={theme.colors.primary}
                  color={theme.colors.textGray}
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
          )}

          {((useLoginByCellphone && loginTab === 'cellphone') || (loginTab === 'otp' && otpType === 'cellphone')) && (
            <View style={{ marginBottom: 20 }}>
              <PhoneInputNumber
                data={phoneInputData}
                handleData={(val: any) => setPhoneInputData(val)}
                flagProps={styles.btnFlag}
                onSubmitEditing={() => null}
                textInputProps={{
                  returnKeyType: 'next',
                  onSubmitEditing: () => inputRef?.current?.focus?.(),
                }}
              />
            </View>
          )}

          {loginTab !== 'otp' && (
            <Controller
              control={control}
              render={({ onChange, value }: any) => (
                <OInput
                  isSecured={!passwordSee ? true : false}
                  placeholder={t('PASSWORD', 'Password')}
                  placeholderTextColor={theme.colors.unselectText}
                  style={styles.input}
                  iconCustomRight={
                    !passwordSee ? (
                      <MaterialCommunityIcons
                        name="eye-outline"
                        size={24}
                        color={theme.colors.arrowColor}
                        onPress={() => setPasswordSee(!passwordSee)}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="eye-off-outline"
                        size={24}
                        color={theme.colors.arrowColor}
                        onPress={() => setPasswordSee(!passwordSee)}
                      />
                    )
                  }
                  selectionColor={theme.colors.primary}
                  color={theme.colors.textGray}
                  value={value}
                  forwardRef={inputRef}
                  onChange={(val: any) => onChange(val)}
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
          )}

          {onNavigationRedirect && loginTab !== 'otp' && (
            <Pressable
              style={{ marginRight: 'auto', marginBottom: 20 }}
              onPress={() => onNavigationRedirect('Forgot')}>
              <OText style={styles.textForgot}>
                {t('FORGOT_YOUR_PASSWORD', 'Forgot your password?')}
              </OText>
            </Pressable>
          )}
          {(enableReCaptcha && recaptchaConfig?.version) && (
            <>
              {recaptchaConfig?.version === 'v3' ? (
                <ReCaptcha
                  url={recaptchaConfig?.baseUrl}
                  siteKey={recaptchaConfig?.siteKey}
                  containerStyle={{ height: 40 }}
                  onExecute={onRecaptchaVerify}
                  reCaptchaType={1}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={{ marginBottom: 15 }}
                    onPress={handleOpenRecaptcha}
                  >
                    <RecaptchaButton>
                      {recaptchaVerified ? (
                        <MaterialCommunityIcons
                          name="checkbox-marked"
                          size={26}
                          color={theme.colors.primary}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="checkbox-blank-outline"
                          size={26}
                          color={theme.colors.mediumGray}
                        />
                      )}
                      <OText size={14} mLeft={8}>{t('VERIFY_ReCAPTCHA', 'Verify reCAPTCHA')}</OText>
                    </RecaptchaButton>
                  </TouchableOpacity>
                  <Recaptcha
                    ref={recaptchaRef}
                    siteKey={recaptchaConfig?.siteKey}
                    baseUrl={recaptchaConfig?.baseUrl}
                    onVerify={onRecaptchaVerify}
                    onExpire={() => setRecaptchaVerified(false)}
                  />
                </>)
              }
            </>
          )}
          <OButton
            onClick={handleLogin}
            text={loginTab !== 'otp' ? t('LOGIN', 'Login') : t('GET_VERIFY_CODE', 'Get verify code')}
            bgColor={theme.colors.primary}
            borderColor={theme.colors.primary}
            imgRightSrc={null}
            isLoading={formState?.loading || loading}
          />
        </FormInput>
      )}

      {useLoginByCellphone &&
        loginTab === 'cellphone' &&
        configs &&
        Object.keys(configs).length > 0 &&
        (configs?.twilio_service_enabled?.value === 'true' ||
          configs?.twilio_service_enabled?.value === '1') && (
          <>
            <OrSeparator>
              <LineSeparator />
              <OText size={18} mRight={20} mLeft={20}>
                {t('OR', 'Or')}
              </OText>
              <LineSeparator />
            </OrSeparator>

            <ButtonsWrapper mBottom={20}>
              <OButton
                onClick={handleVerifyCodeClick}
                text={t('GET_VERIFY_CODE', 'Get Verify Code')}
                borderColor={theme.colors.primary}
                imgRightSrc={null}
                isLoading={isLoadingVerifyModal}
                indicatorColor={theme.colors.primary}
              />
            </ButtonsWrapper>
          </>
        )}

      <OModal
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      >
        <VerifyPhone
          phone={phoneInputData.phone}
          verifyPhoneState={verifyPhoneState}
          checkPhoneCodeState={checkPhoneCodeState}
          handleCheckPhoneCode={handleCheckPhoneCode}
          setCheckPhoneCodeState={setCheckPhoneCodeState}
          handleVerifyCodeClick={handleVerifyCodeClick}
        />
      </OModal>
      <OModal
        open={willVerifyOtpState}
        onClose={() => setWillVerifyOtpState(false)}
        entireModal
        hideIcons
        title={t('ENTER_VERIFICATION_CODE', 'Enter verification code')}
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
        content={alertState.content}
        title={alertState.title || ''}
        onAccept={closeAlert}
        onClose={closeAlert}
      />
    </View>
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

