import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { useApi, useLanguage, useSession } from '@components';
import {
  OButton,
  OInput,
  OModal,
  OText,
  FieldError,
  PasswordToggle,
} from '../shared';
import { getTraduction } from '../../utils';
import { themeSpace } from '@/theme/helpers';

interface RemoveAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

type RemoveAccountStep = 'confirm' | 'password';

export const RemoveAccountModal = (props: RemoveAccountModalProps) => {
  const { open, onClose, onConfirm } = props;

  const theme: any = useTheme();
  const [, t] = useLanguage();
  const [ordering] = useApi();
  const [{ token }] = useSession();

  const [step, setStep] = useState<RemoveAccountStep>('confirm');
  const [password, setPassword] = useState('');
  const [passwordSee, setPasswordSee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A dialog in the modal's box (`OModal box`); the password field is the account page's (its label above the box) and its error the app's `FieldError`.
  const styles = useMemo(() => StyleSheet.create({
    field: { marginTop: themeSpace(theme, 'md') },
    actions: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    action: { flex: 1 },
  }), [theme]);

  useEffect(() => {
    if (open) return;
    setStep('confirm');
    setPassword('');
    setPasswordSee(false);
    setLoading(false);
    setError(null);
  }, [open]);

  const handleChangePassword = (value: string) => {
    setPassword(value);
    if (error) setError(null);
  };

  const handleCheckPassword = async () => {
    if (!password) {
      setError(t('VALIDATION_ERROR_PASSWORD_REQUIRED', 'The field Password is required'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${ordering.root}/users/check_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-App-X': ordering.appId,
          'X-INTERNAL-PRODUCT-X': ordering.appInternalName
        },
        body: JSON.stringify({ password })
      });
      const { error: checkError, result } = await response.json();
      if (checkError) {
        const message = Array.isArray(result) ? result[0] : result;
        setError(message ? getTraduction(message, t) : t('ERROR_INVALID_PASSWORD', 'Invalid password'));
        setLoading(false);
        return;
      }
      onConfirm();
    } catch (err: any) {
      setError(err?.message || t('NETWORK_ERROR', 'Network Error'));
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (step === 'confirm') {
      setStep('password');
      return;
    }
    handleCheckPassword();
  };

  return (
    <OModal open={open} isTransparent box title={t('REMOVE_ACCOUNT', 'Remove account')} onClose={() => !loading && onClose()}>
      {step === 'confirm' ? (
        <OText>
          {t('QUESTION_REMOVE_ACCOUNT', 'Are you sure that you want to remove your account?')}
        </OText>
      ) : (
        <View>
          <OText>
            {t('REMOVE_ACCOUNT_ENTER_PASSWORD', 'Enter your password to confirm. This action cannot be undone.')}
          </OText>
          <View style={styles.field}>
            <OInput
              scope='account_page'
              testID="remove-account-password"
              isSecured={!passwordSee}
              placeholder={t('PASSWORD', 'Password')}
              hasError={!!error}
              iconCustomRight={
                <PasswordToggle scope='account_page' visible={passwordSee} onToggle={() => setPasswordSee(!passwordSee)} />
              }
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChange={handleChangePassword}
              returnKeyType="done"
              onSubmitEditing={handleCheckPassword}
              isDisabled={loading}
            />
          </View>
          {!!error && <FieldError scope='account_page' testID='remove-account-error'>{error}</FieldError>}
        </View>
      )}
      <View style={styles.actions}>
        <View style={styles.action}>
          <OButton
            testID="remove-account-cancel"
            text={t('CANCEL', 'Cancel')}
            color='neutral'
            appearance='outline'
            onClick={onClose}
            disabled={loading}
          />
        </View>
        <View style={styles.action}>
          <OButton
            testID="remove-account-accept"
            text={step === 'confirm' ? t('CONTINUE', 'Continue') : t('REMOVE', 'Remove')}
            color='danger'
            onClick={handleAccept}
            loading={loading}
          />
        </View>
      </View>
    </OModal>
  );
};
