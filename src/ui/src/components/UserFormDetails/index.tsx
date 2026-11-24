import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from 'styled-components/native';

import {
  FieldError,
  KeyboardScreen,
  ONavbar,
  PasswordToggle,
  useConfirm,
  OInput,
} from '../shared';
import { FloatingButton } from '../FloatingButton';
import { sortInputFields } from '../../utils';
import { themeGutter, themePart, themeVisible } from '@/theme/helpers';

import {
  UserFormDetails as UserFormDetailsController,
  useSession,
  useLanguage,
  ToastType,
  useToast,
} from '@components';
import { PhoneInputNumber } from '../PhoneInputNumber';

/** The profile's fields: the ones its project asks for (by code) and the password and its confirmation. */
type UserFormDetailsValues = { password: string; confirmPassword: string; [field: string]: string };

/** The two screens this form is: the personal data, or the password alone. */
export type UserFormPart = 'information' | 'password';

/** A value as a form holds it: a missing one and an empty one are the same. */
const asTyped = (value: any) => (value === null || value === undefined ? '' : String(value));

/** Whether a field's value is other than the one the screen opened with (`opened`: what the session holds). */
export const differsFromOpened = (value: any, opened: any) => asTyped(value) !== asTyped(opened);

/**
 * A screen of its own for what the profile lets the driver change: the personal data (`information`:
 * the fields the server asks for and the phone) or the password and its confirmation (`password`). It
 * lives in its own headless controller, so leaving the screen leaves what was typed unsaved: nothing is
 * sent until the bottom bar's Update. The server's validation fields still decide which fields exist
 * and which are required; a save that goes through shows its toast and takes the driver back. Leaving
 * with what was typed not saved (the bar's back arrow, the system's back button or swipe) asks first:
 * it throws the typing away.
 */
export const UserFormDetailsUI = (props: any) => {
  const {
    part = 'information',
    isEdit,
    formState,
    showField,
    isRequiredField,
    validationFields,
    handleChangeInput,
    handleButtonUpdateClick,
    navigation,
  } = props;

  const theme: any = useTheme();
  // The form's rhythm is the theme's `field`; a field's error is the app's `FieldError`.
  const styles = useMemo(() => {
    const field = themePart(theme, 'field', 'base');
    return StyleSheet.create({
      screen: { flex: 1 },
      content: { paddingHorizontal: themeGutter(theme), gap: field.gap },
    });
  }, [theme]);
  const [, t] = useLanguage();
  const [, { showToast }] = useToast();
  const { handleSubmit, control, setValue, watch, formState: { errors } } = useForm<UserFormDetailsValues>();

  const [{ user }] = useSession();
  const confirm = useConfirm();
  const [passwordSee, setPasswordSee] = useState(false);
  const [confirmSee, setConfirmSee] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState<any>(null);
  const [phoneInputData, setPhoneInputData] = useState({
    error: '',
    phone: {
      country_phone_code: null,
      cellphone: null,
    },
  });

  // Empty until its field is typed in (v7's `watch` answers `undefined` before the field registers).
  const watchPassword = watch('password', '');
  const watchConfirmPassword = watch('confirmPassword', '');
  const passwordsDiffer = watchConfirmPassword.length > 0 && watchPassword !== watchConfirmPassword;
  const passwordsMatchMessage = t('VALIDATION_ERROR_PASSWORDS_MATCH', 'The passwords do not match');

  const isPassword = part === 'password';
  const showInputPhoneNumber =
    validationFields?.fields?.checkout?.cellphone?.enabled ?? false;

  const getInputRules = (field: any) => {
    const rules: any = {
      required: isRequiredField(field.code)
        ? t(
          `VALIDATION_ERROR_${field.code.toUpperCase()}_REQUIRED`,
          `${field.name} is required`,
        ).replace('_attribute_', t(field.name, field.code))
        : null,
    };
    if (field.code && field.code === 'email') {
      rules.pattern = {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: t('INVALID_ERROR_EMAIL', 'Invalid email address').replace(
          '_attribute_',
          t('EMAIL', 'Email'),
        ),
      };
    }

    return rules;
  };

  useEffect(() => {
    if (user?.cellphone) {
      setUserPhoneNumber(user?.country_phone_code ? `+${user.country_phone_code} ${user.cellphone}` : user.cellphone);
      setPhoneInputData((current) => ({
        ...current,
        phone: {
          country_phone_code: user?.country_phone_code || null,
          cellphone: user?.cellphone || null,
        },
      } as any));
    }
  }, [user]);

  const onSubmit = (values: any) => {
    if (phoneInputData.error) {
      showToast(ToastType.Error, phoneInputData.error);
      return;
    }
    if (
      Object.keys(formState.changes).length > 0 ||
      (watchPassword.length > 0 && watchConfirmPassword.length > 0)
    ) {
      if (
        formState.changes?.cellphone === null &&
        validationFields?.fields?.checkout?.cellphone?.enabled &&
        validationFields?.fields?.checkout?.cellphone?.required
      ) {
        showToast(
          ToastType.Error,
          t(
            'VALIDATION_ERROR_MOBILE_PHONE_REQUIRED',
            'The field Phone Number is required.',
          ),
        );
        return;
      }
      let changes = null;
      if (user?.cellphone && !userPhoneNumber) {
        changes = {
          country_phone_code: '',
          cellphone: '',
        };
      }

      if (values.password && values.confirmPassword) {
        changes = {
          password: values.password,
        };
      }

      handleButtonUpdateClick(changes);
    }
  };

  const handleChangePhoneNumber = (number: any) => {
    setPhoneInputData(number);
    let phoneNumber = {
      country_phone_code: {
        name: 'country_phone_code',
        value: number.phone.country_phone_code,
      },
      cellphone: {
        name: 'cellphone',
        value: number.phone.cellphone,
      },
    };
    handleChangeInput(phoneNumber, true);
  };

  // What is wrong with the form, once, for the driver who cannot see the field it is under.
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const list: any[] = Object.values(errors);

      if (phoneInputData.error) {
        list.push({ message: phoneInputData.error });
      }

      let stringError = '';
      list.map((item: any, i: number) => {
        stringError +=
          i + 1 === list.length ? `- ${item.message}` : `- ${item.message}\n`;
      });

      showToast(ToastType.Error, stringError);
    }
  }, [errors]);

  // The save's answer: its error, or its success (and the way back, below).
  useEffect(() => {
    if (formState?.result?.result && !formState?.loading) {
      if (formState.result.error) {
        const message = Array.isArray(formState.result.result) ? formState.result.result[0] : formState.result.result;
        showToast(ToastType.Error, message);
      } else {
        showToast(ToastType.Success, t('UPDATE_SUCCESSFULLY', 'Update successfully'));
      }
    }
  }, [formState?.result]);

  // What was typed and not saved: a value of the data that is not the one the screen opened with (typing a letter
  // and deleting it is no change), or anything in the password fields (they open empty).
  const hasDataChanges = Object.keys(formState?.changes ?? {}).some((key) => differsFromOpened(formState.changes[key], user?.[key]));
  const hasUnsaved = isPassword
    ? watchPassword.length > 0 || watchConfirmPassword.length > 0
    : hasDataChanges;
  const hasUnsavedRef = useRef(false);
  hasUnsavedRef.current = hasUnsaved;
  // The way out is open: the save went through (the form's own way back) or the driver chose to discard.
  const leavingRef = useRef(false);

  // Leaving with unsaved typing asks first; `proceed` is the way out the driver chose.
  const askToDiscard = (proceed: () => void) => confirm({
    message: t('QUESTION_DISCARD_CHANGES', 'You have changes that are not saved. Do you want to discard them?'),
    acceptText: t('DISCARD', 'Discard'),
    cancelText: t('KEEP_EDITING', 'Keep editing'),
    destructive: true,
    onAccept: () => {
      leavingRef.current = true;
      proceed();
    }
  });

  const handleBack = () => {
    if (hasUnsavedRef.current && !leavingRef.current) {
      askToDiscard(() => navigation?.goBack?.());
      return;
    }
    navigation?.goBack?.();
  };

  // The system's back button and the swipe leave without the bar's arrow: they ask the same.
  const askToDiscardRef = useRef(askToDiscard);
  askToDiscardRef.current = askToDiscard;
  useEffect(() => {
    if (!navigation?.addListener) return;
    return navigation.addListener('beforeRemove', (event: any) => {
      if (!hasUnsavedRef.current || leavingRef.current) return;
      event.preventDefault();
      askToDiscardRef.current(() => navigation.dispatch(event.data.action));
    });
  }, [navigation]);

  // The controller turns the edit off when the save went through: the driver goes back to the profile.
  useEffect(() => {
    if (!isEdit) {
      leavingRef.current = true;
      navigation?.goBack?.();
    }
  }, [isEdit]);

  const fields = !validationFields?.loading
    ? sortInputFields({ values: validationFields?.fields?.checkout })
    : [];
  const sanitizeEmail = (value: string) =>
    value.toLowerCase().replace(/[&,()%";:ç?<>{}\\[\]\s]/g, '');

  // Update waits for something to save: a change in the data, or both password fields typed.
  const canUpdate = isPassword
    ? watchPassword.length > 0 && watchConfirmPassword.length > 0 && !passwordsDiffer
    : hasDataChanges;

  const renderFields = () => fields.map(
    (field: any) =>
      showField &&
      showField(field.code) &&
      (
        <View key={field.id ?? field.code}>
          <Controller
            control={control}
            render={() => (
              <OInput
                scope='account_page'
                name={field.code}
                placeholder={t(
                  field.code.toUpperCase(),
                  field?.name,
                )}
                autoCapitalize={
                  field.code === 'email' ? 'none' : 'sentences'
                }
                hasError={!!errors?.[field.code]}
                value={
                  formState?.changes[field.code] ??
                  (user && user[field.code]) ??
                  ''
                }
                onChange={(val: any) => {
                  field.code !== 'email'
                    ? setValue(field.code, val.target.value)
                    : setValue(field.code, sanitizeEmail(val.target.value));
                  field.code !== 'email'
                    ? handleChangeInput(val)
                    : handleChangeInput({
                      target: {
                        name: 'email',
                        value: sanitizeEmail(val.target.value),
                      },
                    });
                }}
                autoCorrect={field.code === 'email' && false}
                type={
                  field.code === 'email'
                    ? 'email-address'
                    : 'default'
                }
                returnKeyType="done"
                autoCompleteType={
                  field.code === 'email' ? 'email' : 'off'
                }
              />
            )}
            name={field.code}
            rules={getInputRules(field)}
            defaultValue={user && user[field.code]}
          />
          {!!errors?.[field.code] && (
            <FieldError scope='account_page' testID={`error-${field.code}`}>{errors[field.code]?.message}</FieldError>
          )}
        </View>
      ),
  );

  const renderPhone = () => !!showInputPhoneNumber && (
    <PhoneInputNumber
      scope='account_page'
      data={phoneInputData}
      handleData={(val: any) => handleChangePhoneNumber(val)}
      defaultValue={user?.cellphone}
      defaultCode={user?.country_phone_code || null}
    />
  );

  // The password and its confirmation: `visibility.profile.password` (the profile only links here when it shows).
  const renderPassword = () => themeVisible(theme, 'profile.password') && (
    <>
      <Controller
        control={control}
        render={({ field: { onChange, value } }) => (
          <OInput
            scope='account_page'
            isSecured={!passwordSee}
            placeholder={t('PASSWORD', 'Password')}
            iconCustomRight={
              <PasswordToggle
                scope='account_page'
                visible={passwordSee}
                onToggle={() => setPasswordSee(!passwordSee)}
              />
            }
            value={value}
            onChange={(val: any) => onChange(val)}
            returnKeyType="done"
            blurOnSubmit
          />
        )}
        name="password"
        defaultValue=""
      />

      <View>
        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <OInput
              scope='account_page'
              isSecured={!confirmSee}
              placeholder={t(
                'MOBILE_CONFIRM_PASSWORD',
                'Confirm Password',
              )}
              iconCustomRight={
                <PasswordToggle
                  scope='account_page'
                  visible={confirmSee}
                  onToggle={() => setConfirmSee(!confirmSee)}
                />
              }
              hasError={!!errors.confirmPassword || passwordsDiffer}
              value={value}
              onChange={(val: any) => onChange(val)}
              returnKeyType="done"
              blurOnSubmit
            />
          )}
          rules={{
            validate: (value: any) => {
              return (
                watchPassword === value ||
                passwordsMatchMessage
              );
            },
          }}
          name="confirmPassword"
          defaultValue=""
        />

        {(!!errors.confirmPassword || passwordsDiffer) && (
          <FieldError scope='account_page' testID='error-confirmPassword'>
            {errors.confirmPassword?.message ?? passwordsMatchMessage}
          </FieldError>
        )}
      </View>
    </>
  );

  return (
    <KeyboardScreen
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ONavbar
        title={isPassword ? t('PASSWORD', 'Password') : t('INFORMATION', 'Information')}
        onBack={handleBack}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        {isPassword ? renderPassword() : (
          <>
            {renderFields()}
            {renderPhone()}
          </>
        )}
      </ScrollView>
      {/* The app's bottom bar, in the flow so the keyboard lifts it with the screen. */}
      <FloatingButton
        inline
        isPadding
        testID='profile-form-bar'
        buttonTestID='profile-form-update'
        btnText={formState?.loading ? t('UPDATING', 'Updating') : t('UPDATE', 'Update')}
        loading={!!formState?.loading}
        disabled={!canUpdate || !!formState?.loading || !!validationFields?.loading}
        firstButtonClick={() => handleSubmit(onSubmit)()}
      />
    </KeyboardScreen>
  );
};

/** The form wired to its own headless controller: what it holds is lost with the screen. */
export const UserFormDetails = (props: any) => {
  const formProps = {
    ...props,
    UIComponent: UserFormDetailsUI,
  };

  return <UserFormDetailsController {...formProps} />;
};
