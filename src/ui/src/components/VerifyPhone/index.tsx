import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatCountdown, getTraduction } from '../../utils';
import { useCountdownTimer } from '../../hooks/useCountdownTimer';
import { FieldError, LoadingOverlay, OLink, OOtpInput, OText } from '../shared';
import { AuthAction, AuthScreen, AuthTimer } from '../LoginForm/AuthPieces';
import { themePart, themeSpace } from '@/theme/helpers';
import { useLanguage } from '@components';
import { useTheme } from 'styled-components/native';

// The seconds a code lasts: 10 minutes.
const TIME_COUNTDOWN = 60 * 10;
// The digits of the code sent to the phone.
const CODE_LENGTH = 4;

/**
 * The phone verification, a screen of the auth flow like the login code's: what the code is for, the
 * countdown (`components.timer`, written by the app's one countdown format: "09:59"), the code sent by
 * SMS in the app's one code entry (decision D6) and the resend link (`auth_form.slots.resend`), with its
 * Cancel pinned to the bottom (`auth_form.slots.cancel`), which calls `onClose`: the way out.
 */
export const VerifyPhone = (props: any) => {
  const {
    phone,
    formValues,
    verifyPhoneState,
    checkPhoneCodeState,
    setCheckPhoneCodeState,
    handleCheckPhoneCode,
    handleVerifyCodeClick,
    onClose,
  } = props;
  const [, t] = useLanguage();

  const theme: any = useTheme();
  // The seconds left of the code: they count down from the mount, and again from a resend.
  const [secondsLeft, , restartCountdown]: any = useCountdownTimer(TIME_COUNTDOWN, true);
  const [verifyCode, setVerifyCode] = useState('');

  const lastNumbers =
    phone?.cellphone &&
    `${phone?.cellphone.charAt(
      phone?.cellphone.length - 2,
    )}${phone?.cellphone.charAt(phone?.cellphone.length - 1)}`;

  const checkResult = (result: any) => {
    if (!result) return;
    return typeof result === 'string' ? [result] : result;
  };

  const handleSendCodeAgain = () => {
    setCheckPhoneCodeState && setCheckPhoneCodeState();
    restartCountdown();
    handleVerifyCodeClick && handleVerifyCodeClick();
  };

  // The whole code typed: it is checked at once.
  const handleCodeComplete = (code: string) => {
    const values = {
      ...formValues,
      cellphone: phone.cellphone,
      country_phone_code: `+${phone.country_phone_code}`,
      code,
    };
    handleCheckPhoneCode && handleCheckPhoneCode(values);
  };

  const codeState = verifyPhoneState?.result?.error ? verifyPhoneState : checkPhoneCodeState;
  const hasError = !!(codeState && !codeState.loading && codeState.result?.error && codeState.result?.result);
  const isExpired = secondsLeft === 0;
  const resendSlot = themePart(theme, 'auth_form', 'slots.resend');
  const styles = useMemo(() => StyleSheet.create({
    // The lead under the title is centered with the rest of the column; the errors are as wide as it.
    lead: { textAlign: 'center' },
    errors: { alignSelf: 'stretch', gap: themeSpace(theme, 'xs') },
    resend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: themeSpace(theme, 'xs'),
    },
  }), [theme]);

  return (
    <AuthScreen
      centered
      title={t('VERIFY_PHONE', 'Verify Phone')}
      footer={(
        <AuthAction
          slot='cancel'
          testID='verify-phone-cancel'
          text={t('CANCEL', 'Cancel')}
          onPress={() => onClose && onClose()}
        />
      )}
    >
      {lastNumbers && (
        <OText preset='body_lg' color='text_muted' style={styles.lead}>
          {`${t(
            'MESSAGE_ENTER_VERIFY_CODE',
            'Please, enter the verification code we sent to your mobile ending with',
          )} **${lastNumbers}`}
        </OText>
      )}
      <AuthTimer text={formatCountdown(secondsLeft)} expired={isExpired} />
      <OOtpInput
        testID='verify-phone-code'
        length={CODE_LENGTH}
        value={verifyCode}
        onChange={setVerifyCode}
        onComplete={handleCodeComplete}
        disabled={isExpired}
        hasError={hasError}
      />
      {hasError && (
        <View style={styles.errors}>
          {checkResult(codeState.result?.result)?.map((e: any, i: number) => (
            <FieldError key={i} center scope='auth_form'>
              {`* ${t(getTraduction(e, t))}`}
            </FieldError>
          ))}
        </View>
      )}
      <View style={styles.resend}>
        <OText>
          {t('ARE_YOU_NOT_SEEING_THE_CODE', 'Are you not seeing the code?')}
        </OText>
        <OLink
          shorcut={t('SEND_AGAIN', 'Send Again')}
          onPress={() => handleSendCodeAgain()}
          size={resendSlot.size}
          variant={resendSlot.variant ?? undefined}
        />
      </View>
      <LoadingOverlay visible={checkPhoneCodeState.loading} />
    </AuthScreen>
  );
};
