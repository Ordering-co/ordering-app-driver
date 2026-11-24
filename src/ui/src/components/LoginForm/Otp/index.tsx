import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components/native';

import { apiErrorText, formatCountdown } from '../../../utils'
import { otpParams } from '../../../types'
import { AuthAction, AuthScreen, AuthTimer } from '../AuthPieces';
import { OLink, useNotice, OOtpInput } from '../../shared';
import type { OOtpInputHandle } from '../../shared/OOtpInput';
import { themePart } from '@/theme/helpers';

import { useLanguage } from '@components';
import { useCountdownTimer } from '../../../hooks/useCountdownTimer';

const FOCUS_FIELD_DELAY = 500

/**
 * The login code screen: the countdown (`components.timer`), the code in the
 * app's one code entry (decision D6) and the resend link (`auth_form.slots.resend`),
 * with its Cancel pinned to the bottom (`auth_form.slots.cancel`). It has no back
 * arrow: Cancel is the way out.
 */
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

  const theme: any = useTheme();
  const [, t] = useLanguage();
  const notify = useNotice();
  const [code, setCode] = useState('')
  const [otpLeftTime, _, resetOtpLeftTime]: any = useCountdownTimer(
    600, willVerifyOtpState)
  // The code entry takes the focus when the screen asks for it (`focus()` of its handle).
  const codeRef = useRef<OOtpInputHandle>(null)

  const focusTimeoutRef = useRef<any>(null)

  const handleCodeChanged = (value: string) => {
    setCode(value)
  }

  const focusCurrentField = () => {
    focusTimeoutRef.current && clearTimeout(focusTimeoutRef.current)
    focusTimeoutRef.current = setTimeout(() => {
      codeRef.current?.focus()
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

  // The login's state the screen opened with: an answer to an earlier request (a password that was refused), not
  // to this screen's. Only an answer that comes after it is shown.
  const openedWith = useRef(formState)

  useEffect(() => {
    if (formState === openedWith.current) return
    if (!formState?.loading && formState?.result?.error) {
      notify({
        title: t('ERROR', 'Error'),
        message: apiErrorText(formState.result?.result, t),
        acceptText: t('ACCEPT', 'Accept'),
        onAccept: () => focusCurrentField()
      })

      if (code.length === (pinCount || 6)) {
        handleCodeChanged('')
      }

    }
  }, [formState])

  const resendSlot = themePart(theme, 'auth_form', 'slots.resend');

  return (
    <AuthScreen
      centered
      title={t('ENTER_VERIFICATION_CODE', 'Enter verification code')}
      footer={(
        <AuthAction
          slot='cancel'
          testID='otp-cancel'
          text={t('CANCEL', 'Cancel')}
          onPress={() => setWillVerifyOtpState(false)}
        />
      )}
    >
      <AuthTimer text={formatCountdown(otpLeftTime)} expired={otpLeftTime === 0} />
      <OOtpInput
        ref={codeRef}
        testID='otp-code'
        length={pinCount || 6}
        value={code}
        onChange={handleCodeChanged}
        onComplete={(filled: string) => handleLoginOtp(filled)}
      />
      <OLink
        shorcut={t('RESEND_CODE', 'Resend code')}
        onPress={() => handleOnSubmit()}
        disabled={otpLeftTime > 520}
        size={resendSlot.size}
        variant={resendSlot.variant ?? undefined}
      />
    </AuthScreen>
  )
}
