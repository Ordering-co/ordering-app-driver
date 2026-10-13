import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import OTPInputView from '@twotalltotems/react-native-otp-input'
import { useTheme } from 'styled-components/native';

import { formatSeconds } from '../../../utils'
import { otpParams } from '../../../types'
import { OTPContainer } from './styles';

import { useLanguage } from '@components';
import { useCountdownTimer, OText, OButton } from '@ui';

const FOCUS_FIELD_DELAY = 500

export const Otp = (props: otpParams) => {
  const {
    willVerifyOtpState,
    setWillVerifyOtpState,
    onSubmit,
    handleLoginOtp,
    setAlertState,
    pinCount,
    formState,
    isAlertOpen
  } = props

  const theme = useTheme();
  const [, t] = useLanguage();
  const [code, setCode] = useState('')
  const [otpLeftTime, _, resetOtpLeftTime]: any = useCountdownTimer(
    600, willVerifyOtpState)

  const otpInputRef = useRef<any>(null)
  const codeRef = useRef('')
  const focusTimeoutRef = useRef<any>(null)

  const handleCodeChanged = (value: string) => {
    codeRef.current = value
    setCode(value)
  }

  const focusCurrentField = () => {
    focusTimeoutRef.current && clearTimeout(focusTimeoutRef.current)
    focusTimeoutRef.current = setTimeout(() => {
      const nextIndex = Math.min(codeRef.current.length, (pinCount || 6) - 1)
      otpInputRef.current?.blurAllFields?.()
      otpInputRef.current?.focusField?.(nextIndex)
    }, FOCUS_FIELD_DELAY)
  }

  useEffect(() => {
    if (!willVerifyOtpState || isAlertOpen) return
    focusCurrentField()
    return () => {
      focusTimeoutRef.current && clearTimeout(focusTimeoutRef.current)
    }
  }, [willVerifyOtpState, isAlertOpen])

  const handleOnSubmit = () => {
    setAlertState({
      open: true,
      title: t('CODE_SENT', 'The code has been sent'),
    })
    resetOtpLeftTime()
    onSubmit()
  }

  useEffect(() => {
    if (otpLeftTime === 0) {
      setAlertState({
        open: true,
        title: t('TIME_IS_UP', 'Time is up'),
        content: t('PLEASE_RESEND_CODE', 'Please resend code again')
      })
    }
  }, [otpLeftTime])

  useEffect(() => {
    if (!formState?.loading && formState?.result?.error) {
      Alert.alert(
        t('ERROR', 'Error'),
        typeof formState.result?.result === 'string'
          ? formState.result?.result
          : formState.result?.result[0],
        [
          {
            text: t('ACCEPT', 'Accept'),
            onPress: () => focusCurrentField(),
            style: 'cancel'
          },
        ],
        { cancelable: false }
      )

      if (code.length === (pinCount || 6)) {
        handleCodeChanged('')
      }

    }
  }, [formState])

  const loginStyle = StyleSheet.create({
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
  });

  return (
    <>
      <OTPContainer>
        <OText size={24}>
          {formatSeconds(otpLeftTime)}
        </OText>
        <OTPInputView
          ref={otpInputRef}
          style={{ width: '100%', height: 150 }}
          pinCount={pinCount || 6}
          codeInputFieldStyle={loginStyle.underlineStyleBase}
          codeInputHighlightStyle={loginStyle.underlineStyleHighLighted}
          onCodeFilled={(code: string) => handleLoginOtp(code)}
          selectionColor={theme.colors.primary}
          editable
          code={code}
          onCodeChanged={(code: string) => handleCodeChanged(code)}
        />
        <TouchableOpacity onPress={() => handleOnSubmit()} disabled={otpLeftTime > 520}>
          <OText size={16} mBottom={30} color={otpLeftTime > 520 ? theme.colors.disabled : theme.colors.primary}>
            {t('RESEND_CODE', 'Resend code')}
          </OText>
        </TouchableOpacity>
        <OButton
          onClick={() => setWillVerifyOtpState(false)}
          bgColor={theme.colors.white}
          borderColor={theme.colors.primary}
          textStyle={{ color: theme.colors.primary }}
          style={{ borderRadius: 8, width: '100%' }}
          text={t('CANCEL', 'Cancel')}
        />
      </OTPContainer>
    </>
  )
}
