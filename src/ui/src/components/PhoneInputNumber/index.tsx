import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { isValidPhoneNumber, CountryCode } from 'libphonenumber-js/max';

import { CountryFlag } from './CountryFlag';
import { COUNTRIES } from './countries';
import { Calling, nationalNumberOf, parseFullNumber, resolveDefaultCalling, withoutSeparators } from './calling';
import { PhoneInputParams } from '../../types';

import { useLanguage, useConfig } from '@components';
import { FieldError, Icon, OInput, OSelect, OText } from '../shared';
import { nativeBoxStyle, nativeTextStyle, themeIconSize, themeOpacity, themeScoped, themeSpace } from '@/theme/helpers';

/**
 * The phone field: the country (its flag and calling code, opening the
 * countries in the app's select sheet) and the number, in the theme's input
 * (`components.input`, its error the app's `FieldError`, at the start, under
 * the whole row). The app's own, in place of react-native-phone-number-input
 * and its country modal (decision D2): the number is validated with
 * libphonenumber-js and reported to `handleData`
 * (`phone.country_phone_code` and `phone.cellphone`, the national
 * number without its country's trunk prefix). The calling code is the
 * country's, by ISO (`./calling`); a number typed or pasted whole
 * (`+52 55 1234 5678`) sets its country and leaves the national number.
 */

// Countries with more than one calling code keep the one of their row (Puerto Rico).
const countriesWithSubOptions = ['PR']

const phoneStyles = (theme: any, scope?: string) => {
  const input = theme.native.components.input
  const base = input.base
  const field = (scope ? themeScoped(theme, scope, 'field') : theme.native.components.field).base
  return StyleSheet.create({
    // With the field's label above (`field.label_position`), the country sits beside the box.
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: themeSpace(theme, 'sm'), width: '100%' },
    country: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: base.icon_gap,
      minHeight: input.sizes.md.height,
      // The country's trigger is narrower than a field: `sm` at the sides, as the board draws it.
      paddingHorizontal: themeSpace(theme, 'sm'),
      borderRadius: base.radius,
      ...nativeBoxStyle(base),
    },
    countryDisabled: nativeBoxStyle(input.variants.default.states.disabled),
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    code: { ...nativeTextStyle(base.text), color: base.text_color },
    number: { flex: 1 },
    // The label of a scope whose fields have it above: over the whole row (the country and the number), at its start,
    // as the other fields' labels (`OInput`'s look).
    label: { ...nativeTextStyle(field.label), color: field.label_color, marginBottom: field.label_gap },
  })
}

/** The phone field's own props over the shared ones. */
type PhoneFieldProps = PhoneInputParams & {
  /**
   * The group the field is in (`account_page`): its `scope` of `input` and `field`, as `OInput`'s. The
   * profile's form and the auth forms set it, so the number's label sits above its box as every field's
   * of those screens; a field with no scope keeps its label as its placeholder.
   */
  scope?: string;
};

export const PhoneInputNumber = (props: PhoneFieldProps) => {
  const {
    scope,
    data,
    handleData,
    defaultValue,
    defaultCode,
    forwardRef,
    isDisabled,
    textInputProps,
    onSubmitEditing,
  } = props;

  const theme: any = useTheme();
  const [, t] = useLanguage();
  const [{ configs }] = useConfig();
  const styles = useMemo(() => phoneStyles(theme, scope), [theme, scope]);
  // Only a scope can ask for the label above (the login's field keeps its placeholder inside the box).
  const labelAbove = !!scope && themeScoped(theme, scope, 'field').base.label_position === 'above';
  const label = t('PHONE_NUMBER', 'Phone number');
  const [userphoneNumber, setUserphoneNumber] = useState('');
  const [number, setNumber] = useState<string>(defaultValue ? String(defaultValue) : '');
  // The country chosen in the sheet (or typed with the number); until then, the default one.
  const [picked, setPicked] = useState<Calling | null>(null);
  // The countries of the sheet: one row per calling code (Puerto Rico has two).
  const countries = COUNTRIES;
  // The user has typed in the field: a later `defaultValue` no longer replaces the number.
  const typed = useRef(false);
  const ownRef = useRef<TextInput>(null);
  const inputRef = forwardRef ?? ownRef;
  const input = theme.native.components.input.base;

  // The default country and its calling code, by ISO (a saved numeric code stays as it is).
  const defaults = useMemo(() => resolveDefaultCalling({
    defaultCode,
    configCountry: configs?.default_country_code?.value,
    subOptionCountries: countriesWithSubOptions,
  }, countries), [defaultCode, configs?.default_country_code?.value, countries]);
  const countryCode: string = picked?.countryCode ?? defaults.countryCode;
  const callingCode: string = picked?.code ?? defaults.code;

  const handleChangeNumber = (value: string) => {
    setUserphoneNumber(value);
  };

  // What is typed stays in the field as typed (rewriting it drops the next
  // keystrokes); the number reported has no spaces, dashes or parentheses.
  const onChangeText = (text: string) => {
    typed.current = true;
    const entered = text.trim();
    if (entered.startsWith('+')) {
      // A whole number, with its calling code: its country and the national number.
      const whole = parseFullNumber(entered, countries);
      if (whole) {
        setPicked({ countryCode: whole.countryCode, code: whole.code });
        setNumber(whole.number);
        handleChangeNumber(`+${whole.code}${whole.number}`);
        return;
      }
      // Still being typed: not a number yet (its `+` keeps it refused).
      setNumber(text);
      handleChangeNumber(`+${callingCode}${withoutSeparators(entered)}`);
      return;
    }
    setNumber(text);
    const national = withoutSeparators(text);
    handleChangeNumber(national.length > 0 ? `+${callingCode}${national}` : national);
  };

  /**
   * The national number reported: the country's own (its trunk prefix off, a
   * zero that is part of the number kept: Italy) or, when what is typed is not
   * a number of the country, without a leading zero (as the old library's).
   */
  const numberWithoutZero = () => {
    const own = nationalNumberOf(number, { countryCode, code: callingCode });
    if (own !== null) return own;
    const national = withoutSeparators(number);
    return national.length > 0 && national.startsWith('0') ? national.substring(1) : national;
  };

  useEffect(() => {
    if ((defaultValue && userphoneNumber) || !defaultValue) {
      if (userphoneNumber === '') return;
      let checkValid = false;
      try {
        checkValid = isValidPhoneNumber(userphoneNumber, countryCode as CountryCode);
      } catch {
        checkValid = false;
      }
      const formattedNumber = numberWithoutZero();
      const regex = /^[0-9]*$/;
      const cellphone = userphoneNumber.slice(1, userphoneNumber.length);
      const validNumber = regex.test(cellphone);
      if ((!checkValid && formattedNumber) || !validNumber) {
        handleData &&
          handleData({
            ...data,
            error: t(
              'INVALID_ERROR_PHONE_NUMBER',
              'The Phone Number field is invalid',
            ),
          });
        return;
      }
      handleData &&
        handleData({
          ...data,
          error: '',
          phone: {
            country_phone_code: callingCode,
            cellphone: formattedNumber,
          },
        });
    }
  }, [userphoneNumber]);

  useEffect(() => {
    // A value that arrives (or changes) after the mount is shown, unless the user is typing.
    if (!typed.current) setNumber(defaultValue ? String(defaultValue) : '');
  }, [defaultValue]);

  const flagSize = themeIconSize(theme, 'sm');
  const countryOptions = useMemo(() => countries
    .flatMap((country: any) => (country.callingCode ?? []).map((code: string) => ({
      value: `${country.cca2}:${code}`,
      label: `${country.name} (+${code})`,
      leading: <CountryFlag isoCode={country.cca2} size={flagSize} />,
      country: { ...country, callingCode: [code] },
    })))
    .sort((a: any, b: any) => a.label.localeCompare(b.label)), [countries, flagSize]);

  // The country chosen in the sheet keeps the typed number and reports the new calling code.
  const handleSelectCountry = (option: any) => {
    typed.current = true;
    const country = option.country;
    const code = country.callingCode?.[0] ?? '';
    setPicked({ countryCode: country.cca2, code });
    const national = withoutSeparators(number);
    handleChangeNumber(national.length > 0 && code ? `+${code}${national}` : national);
  };

  return (
    <View>
      {labelAbove && <OText style={styles.label}>{label}</OText>}
      <View style={styles.row} testID='phone-row'>
        <OSelect
          title={t('SELECT_COUNTRY', 'Select country')}
          searchable
          searchPlaceholder={t('SEARCH', 'Search')}
          options={countryOptions}
          value={`${countryCode.toUpperCase()}:${callingCode}`}
          onSelect={(_value, option) => handleSelectCountry(option)}
          disabled={isDisabled}
          renderTrigger={({ open, disabled }) => (
            <Pressable
              testID='phone-country-trigger'
              accessibilityRole='button'
              accessibilityLabel={t('SELECT_COUNTRY', 'Select country')}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={open}
              style={({ pressed }) => [styles.country, disabled && styles.countryDisabled, pressed && styles.pressed]}
            >
              <CountryFlag isoCode={countryCode} size={flagSize} />
              {!!callingCode && <OText style={styles.code}>{`+${callingCode}`}</OText>}
              <Icon name='chevron-down' size='sm' color={input.icon_color} />
            </Pressable>
          )}
        />
        <View style={styles.number}>
          <OInput
            {...(textInputProps as any)}
            testID='phone-input'
            value={number}
            isValueSync
            onChange={onChangeText}
            // With the label above the row the box has none of its own (it names the field for a screen reader).
            {...(labelAbove ? { accessibilityLabel: label } : { placeholder: label })}
            type='phone-pad'
            vertorIcon='phone-outline'
            autoCompleteType='tel'
            blurOnSubmit={textInputProps?.blurOnSubmit ?? true}
            onSubmitEditing={textInputProps?.onSubmitEditing ?? onSubmitEditing}
            forwardRef={inputRef}
            isDisabled={isDisabled}
            hasError={!!data?.error}
            scope={scope}
          />
        </View>
      </View>
      {!!data?.error && <FieldError scope={scope}>{data.error}</FieldError>}
    </View>
  );
};
