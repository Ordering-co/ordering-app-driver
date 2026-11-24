import React, { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';

import { AUTH_FIELD_SCOPE, AuthAction, AuthScreen, useAuthStyles } from '../LoginForm/AuthPieces';
import { apiErrorText } from '../../utils';

import {
  ForgotPasswordForm as ForgotPasswordController,
  useLanguage,
} from '@components';
import { FieldError, OInput, ONotice, OText } from '../shared';

/**
 * The forgot password form, on the auth screen: the lead (the text under the screen's title: `body_lg`,
 * as every lead), the e-mail field with its label above and, pinned to the bottom, the button (the
 * `auth_form` `submit` slot). What the server answers stays on the screen: the link that was sent is a
 * notice until the address is edited, and a failure is one too.
 */
type ForgotPasswordValues = { email: string };

const ForgotPasswordUI = (props: any) => {
  const { navigation, formState, handleButtonForgotPasswordClick } = props;

  const authStyles = useAuthStyles();
  const [, t] = useLanguage();
  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordValues>();

  const [emailSent, setEmailSent] = useState(null);
  // What the server answered to the address that was sent: the link is on its way, or it failed.
  const [answer, setAnswer] = useState<{ variant: 'success' | 'danger', text: string } | null>(null);

  const onSubmit = (values: any) => {
    // The request goes with the keyboard closed (a failed check keeps it, to fix the field).
    Keyboard.dismiss();
    setEmailSent(values.email);
    setAnswer(null);
    handleButtonForgotPasswordClick && handleButtonForgotPasswordClick(values);
  };

  const handleChangeInputEmail = (value: string, onChange: any) => {
    // A new address is a new request: the button sends again and the answer to the old one goes.
    setEmailSent(null);
    setAnswer(null);
    onChange(value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, ''));
  };

  useEffect(() => {
    if (!formState.loading && emailSent) {
      if (formState.result?.error) {
        setEmailSent(null);
        // The server answers a list of messages, or a text (a network failure).
        const { result } = formState.result;
        result && setAnswer({ variant: 'danger', text: apiErrorText(result, t) });
        return;
      }
      setAnswer({
        variant: 'success',
        text: `${t(
          'SUCCESS_SEND_FORGOT_PASSWORD',
          'Your link has been sent to the email',
        )}: ${emailSent}`,
      });
    }
  }, [formState]);

  // The link was sent: the button says so and no longer sends.
  const isSent = !!emailSent && !formState.result?.error;

  return (
    <AuthScreen
      title={t('FORGOT_YOUR_PASSWORD', 'Forgot your password?')}
      onBack={() => navigation?.canGoBack() && navigation.goBack()}
      footer={(
        <AuthAction
          testID='forgot-submit'
          text={
            isSent
              ? t('LINK_SEND_FORGOT_PASSWORD', 'Link Sent')
              : t('FRONT_RECOVER_PASSWORD', 'Recover Password')
          }
          disabled={isSent}
          loading={formState.loading}
          onPress={() => handleSubmit(onSubmit)()}
        />
      )}
    >
      <OText preset='body_lg' color='text_muted'>
        {t(
          'FORGOT_PASSWORD_TEXT_MESSAGE',
          "Enter your email address and we'll send a link to reset your password.",
        )}
      </OText>

      <View style={authStyles.fields}>
        <View>
          <Controller
            control={control}
            render={({ field: { onChange, value } }) => (
              <OInput
                scope={AUTH_FIELD_SCOPE}
                placeholder={t('EMAIL', 'Email')}
                hasError={!!errors?.email}
                onChange={(e: any) => {
                  handleChangeInputEmail(e, onChange);
                }}
                value={value}
                autoCapitalize="none"
                autoCorrect={false}
                type="email-address"
                autoCompleteType="email"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => handleSubmit(onSubmit)()}
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

        {!!answer && (
          <ONotice variant={answer.variant} testID='forgot-notice'>{answer.text}</ONotice>
        )}
      </View>
    </AuthScreen>
  );
};

export const ForgotPasswordForm = (props: any) => {
  const ForgotPasswordProps = {
    ...props,
    UIComponent: ForgotPasswordUI,
  };
  return <ForgotPasswordController {...ForgotPasswordProps} />;
};
