import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { RemoveAccountModal } from './RemoveAccountModal';
import { ProfilePhotoSheet } from './ProfilePhotoSheet';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ProfileRow } from './ProfileRow';
import { RowsCard } from './RowsCard';
import { useProfilePhoto } from './useProfilePhoto';
import { profileStyles } from './styles';
import { ProfileParams } from '../../types';
import { _clearStoreData } from '../../providers/StoreUtil';
import { sortInputFields, apiErrorText, formatPhone } from '../../utils';
import { usePhoneCountry } from '../../hooks/usePhoneCountry';
import { todaysHours } from '../DriverSchedule/hours';
import { themeColor, themePart, themeSpace, themeVisible } from '@/theme/helpers';
import { usePageSections } from '@/theme/sections';
import { useTemporaryBannersWarning } from '@/utils/notificationBannerStyle';

import {
  UserFormDetails as UserProfileController,
  useSession,
  ToastType,
  useToast,
  useLanguage,
  useUtils,
  useConfig,
  useValidationFields
} from '@components';

import {
  Icon,
  OAvatar,
  OButton,
  OCard,
  OLink,
  ONavbar,
  OSwitch,
  OSpinner,
  OText,
  SectionTitle,
} from '../shared'
import { LogoutButton } from '../LogoutButton'
import { LanguageSelector } from '../LanguageSelector'
import { NotFoundSource } from '../NotFoundSource'

/** What the Password row shows in the list: a mask that says nothing of the real one. */
const PASSWORD_MASK = '••••••••';

/** A row of the information card: a field of the user, written as the user has it. */
type InfoRow = { key: string, title: string, value: string };

/**
 * The profile tab: who the driver is (photo, name, e-mail and phone), the availability, the personal
 * data and the way to edit it (its own screens), the account's rows (schedule, sessions, payouts, Stripe
 * account, language), log out and remove account. Every section is the theme's (`pages.profile`), and
 * every row keeps its condition (a theme `visibility` key, a server config or the user's level).
 */
const ProfileUI = (props: ProfileParams) => {
  const {
    formState,
    validationFields,
    handleButtonUpdateClick,
    handleRemovePhoto,
    handleToggleAvalaibleStatusDriver,
    handleRemoveAccount,
    isShowDriverStatus,
    showField,
    navigation
  } = props;

  const [{ user, sessionLoading }] = useSession();
  const [, t] = useLanguage();
  const defaultCountry = usePhoneCountry();
  const [, { showToast }] = useToast();
  const [utils] = useUtils();
  const [{ configs }] = useConfig();
  const [{ loading }, { loadOriginalValidationFields }] = useValidationFields()
  const theme: any = useTheme();
  const styles = useMemo(() => profileStyles(theme), [theme]);
  // The page's sections in the theme's order.
  const { render, isVisible } = usePageSections('profile');

  const [openRemoveAccount, setOpenRemoveAccount] = useState(false);
  const [openPhotoSheet, setOpenPhotoSheet] = useState(false);
  const [userState, setUserState] = useState(props.userState)
  // The language row draws nothing with a single language: its card stays out of sight until it knows.
  const [languageShown, setLanguageShown] = useState(false)
  const allowDriverUpdateData = user?.level !== 4 || configs?.allow_driver_update_data?.value === "1"
  const allowDeleteDriverAccount = user?.level !== 4 || configs?.allow_delete_driver_account?.value === "1"
  const isAdmin = user?.level === 0
  const isStripeConnectPayoutsEnabled = user?.level === 4 && configs?.stripe_connect_payouts_enabled?.value === '1'

  const { takePhoto, chooseFromGallery } = useProfilePhoto({
    onPicked: (url) => handleButtonUpdateClick(null, true, url),
    onDone: () => setOpenPhotoSheet(false),
  });

  const onRemoveAccountConfirmed = () => {
    setOpenRemoveAccount(false)
    handleRemoveAccount && handleRemoveAccount(user?.id)
    _clearStoreData({ excludedKeys: ['isTutorial', 'language'] });
    props?.setRootState && props?.setRootState({ isAuth: false, token: null })
  }

  // The result of the availability switch, said the same on both platforms: when a request the driver asked for ends, a refusal shows what
  // the server said (the controller's own `result.error`: a text, a list or `{ message }`) and a save shows the confirmation. It reads the
  // controller's state and nothing else: the local copy below is replaced by the session's user (and by the controller's answer, which
  // has no `result.result` on an error), so a toast that waited for that copy to hold a user was lost whenever the two raced.
  const availabilityAsked = useRef(false);
  const availabilitySaving = useRef(false);
  const availabilityLoading = !!props.userState?.loadingDriver;
  useEffect(() => {
    const ended = availabilitySaving.current && !availabilityLoading;
    availabilitySaving.current = availabilityLoading;
    if (!ended || !availabilityAsked.current) return;
    availabilityAsked.current = false;
    const refusal = props.userState?.result?.error;
    if (refusal) {
      showToast(ToastType.Error, apiErrorText(refusal, t));
    } else {
      showToast(ToastType.Success, t('AVAILABLE_STATE_IS_UPDATED', 'Available state is updated'));
    }
  }, [availabilityLoading]);

  // The photo is the only thing this page saves: its result is the toast.
  useEffect(() => {
    if (formState.result.result && !formState.loading) {
      if (formState.result?.error) {
        showToast(ToastType.Error, formState.result.result);
      } else {
        showToast(
          ToastType.Success,
          t('UPDATE_SUCCESSFULLY', 'Update successfully'),
        );
      }
    }
  }, [formState.result]);

  useEffect(() => {
    setUserState({ ...userState, ...props.userState })
  }, [props.userState])

  useEffect(() => {
    if (!user?.id) return

    setUserState({
      ...userState,
      result: {
        error: true,
        result: user
      }
    })
  }, [user, props.isFocused])

  // The driver's photo is the app's avatar at the profile photo's own size, radius and glyph size (`components.profile_photo`).
  const photo = themePart(theme, 'profile_photo', 'base');
  const photoBox = { size: photo.size, radius: photo.radius, iconSize: photo.placeholder_icon_size };
  const cameraSlot = themePart(theme, 'profile_photo', 'slots.edit');
  // The profile's section titles are small (`account_page.title`); the other screens' keep `section_header`'s.
  const sectionTitle = themePart(theme, 'account_page', 'base.title');
  const isLoading = sessionLoading;
  const isUploading = !!formState?.loading;
  // The controller's answers replace the local copy's `result` (an error and a request in flight carry no user), so the session's user
  // stands in: the switch keeps its state while a request runs and after a refusal.
  const isAvailable = userState?.result?.result?.available ?? user?.available;
  const fullName = [user?.name, user?.lastname].filter(Boolean).join(' ');
  // The phone as every screen writes it: international, with the driver's country code.
  const phoneToShow = formatPhone(user?.cellphone, user?.country_phone_code, defaultCountry);
  const canEdit = !validationFields?.loading && allowDriverUpdateData;
  // The fields the server asks for, in their fixed order: the ones it turns off are not the driver's to see or edit.
  const fields = !validationFields?.loading
    ? sortInputFields({ values: validationFields?.fields?.checkout }).filter((field: any) => showField?.(field.code))
    : [];
  const phoneEnabled = !!validationFields?.fields?.checkout?.cellphone?.enabled;
  const infoRows: InfoRow[] = [
    ...fields.map((field: any) => ({
      key: field.code,
      title: t(field.code.toUpperCase(), field?.name),
      value: `${user?.[field.code] ?? ''}`
    })),
    ...(phoneEnabled ? [{ key: 'cellphone', title: t('PHONE', 'Phone'), value: phoneToShow || t('NOT_PHONE', 'Not Phone') }] : []),
  ];
  const showPassword = canEdit && themeVisible(theme, 'profile.password');

  const today = todaysHours(user?.schedule, utils);
  const scheduleValue = !today
    ? undefined
    : today.enabled ? `${t('TODAY', 'Today')} ${today.hours}` : t('NOT_AVAILABLE', 'Not available');
  const rows = [
    themeVisible(theme, 'menu.schedule') && { key: 'schedule', icon: 'calendar-outline', title: t('SCHEDULE', 'Schedule'), value: scheduleValue, onPress: () => navigation.navigate('Schedule') },
    themeVisible(theme, 'menu.sessions') && { key: 'sessions', icon: 'phone-portrait-outline', title: t('SESSIONS', 'Sessions'), onPress: () => navigation.navigate('Sessions') },
    isStripeConnectPayoutsEnabled && { key: 'payouts', icon: 'cash-outline', title: t('PAYOUTS', 'Payouts'), onPress: () => navigation.navigate('Payouts') },
    isStripeConnectPayoutsEnabled && { key: 'stripe', icon: 'card-outline', title: t('STRIPE_ACCOUNT', 'Stripe account'), onPress: () => navigation.navigate('StripeConnectAccount') },
  ].filter(Boolean) as Array<{ key: string, icon: string, title: string, value?: string, onPress: () => void }>;

  // The photo is a touch target of its own, and the camera button on its corner opens the same sheet.
  const renderPhoto = () => (
    <View style={styles.identity}>
      <View style={styles.photoFrame}>
        <Pressable
          testID='profile-photo'
          accessibilityRole='imagebutton'
          accessibilityLabel={t('CHANGE_PHOTO', 'Change photo')}
          disabled={isUploading}
          onPress={() => setOpenPhotoSheet(true)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <OAvatar
            testID='profile-photo-box'
            source={user?.photo ?? null}
            {...photoBox}
          />
        </Pressable>
        {isUploading && (
          <View style={styles.uploading} pointerEvents='none'>
            <OSpinner testID='profile-photo-loading' color='on_overlay' />
          </View>
        )}
        <View style={styles.camera}>
          <OButton
            iconOnly
            round={cameraSlot.shape === 'round'}
            size={cameraSlot.size}
            color={cameraSlot.color}
            appearance={cameraSlot.appearance}
            testID='profile-photo-edit'
            accessibilityLabel={t('CHANGE_PHOTO', 'Change photo')}
            disabled={isUploading}
            icon={<Icon name='camera-outline' size='sm' />}
            onClick={() => setOpenPhotoSheet(true)}
          />
        </View>
      </View>
      <View style={styles.who}>
        {!!fullName && <OText style={styles.name} numberOfLines={1}>{fullName}</OText>}
        {!!user?.email && <OText preset='body_sm' color='text_muted' numberOfLines={1}>{user.email}</OText>}
        {!!phoneToShow && <OText preset='body_sm' color='text_muted' numberOfLines={1}>{phoneToShow}</OText>}
      </View>
    </View>
  );

  const availabilityTitle = t(
    `${!isShowDriverStatus ? 'NOT_' : ''}AVAILABLE_TO_RECEIVE_ORDERS`,
    `${!isShowDriverStatus ? 'You are not ' : ''}Available to receive orders`
  );
  // Switching on needs a persistent banner style on iOS (decision 2026-11-17): the style is
  // asked every time (the driver may have just changed it in Settings); a temporary one refuses
  // (nothing is sent) and shows the alert. Switching off is always allowed.
  const warnIfTemporaryBanners = useTemporaryBannersWarning()
  const availabilityCheckRef = useRef(false)
  const handleAvailabilityChange = async () => {
    if (!handleToggleAvalaibleStatusDriver || availabilityCheckRef.current) return
    if (!isAvailable) {
      availabilityCheckRef.current = true
      const refused = await warnIfTemporaryBanners().finally(() => { availabilityCheckRef.current = false })
      if (refused) return
    }
    availabilityAsked.current = true
    handleToggleAvalaibleStatusDriver(!isAvailable)
  }
  // The availability is a tinted box, not a bordered card: the soft fill, no border, no shadow.
  const tint = useMemo(() => ({ background: themeColor(theme, 'surface_alt'), border: null, shadow: null, padding: themeSpace(theme, 'md') }), [theme]);
  const renderAvailability = () => user?.level === 4 && (
    <OCard look={tint} testID='profile-availability'>
      <View style={styles.availability}>
        <OText preset='label' style={styles.grow}>{availabilityTitle}</OText>
        {isShowDriverStatus && (
          // The switch stays where it is while the request runs: disabled (so a second tap sends nothing), never swapped for a
          // spinner, so the row keeps its height and nothing on the page moves.
          <OSwitch
            testID='profile-availability-switch'
            accessibilityLabel={availabilityTitle}
            value={!!isAvailable}
            onChange={handleAvailabilityChange}
            disabled={availabilityLoading}
          />
        )}
      </View>
    </OCard>
  );

  // The personal data, read-only, and the way to change it: Edit (the information's own screen) and
  // the Password row (its own screen too). A driver without the right to change them sees them only.
  const renderInformation = () => {
    if (infoRows.length === 0 && !canEdit) return null;
    return (
      <View testID='profile-information'>
        <View style={styles.titleRow}>
          <SectionTitle text={sectionTitle} style={styles.titleText}>{t('INFORMATION', 'Information')}</SectionTitle>
          {canEdit && (
            <OLink testID='profile-edit' shorcut={t('EDIT', 'Edit')} onPress={() => navigation.navigate('ProfileEdit')} />
          )}
        </View>
        {(infoRows.length > 0 || showPassword) && (
          <RowsCard>
            {infoRows.map((row) => (
              <ProfileRow key={row.key} testID={`profile-info-${row.key}`} information title={row.title} value={row.value} />
            ))}
            {showPassword && (
              <ProfileRow
                key='password'
                testID='profile-info-password'
                information
                title={t('PASSWORD', 'Password')}
                value={PASSWORD_MASK}
                onPress={() => navigation.navigate('ProfilePassword')}
              />
            )}
          </RowsCard>
        )}
      </View>
    );
  };

  // The language is a row of the account's card when both sections are shown; with the account hidden it
  // is a card of its own. Either way the card stays out of sight until the row is known to exist.
  const languageRow = (divided: boolean) => <LanguageSelector divided={divided} onShownChange={setLanguageShown} />;

  const renderAccount = () => {
    const withLanguage = isVisible('language');
    if (rows.length === 0 && !withLanguage) return null;
    const nothingYet = rows.length === 0 && !languageShown;
    return (
      <View style={nothingYet ? styles.none : undefined} testID='profile-account'>
        <SectionTitle text={sectionTitle} style={styles.titleAlone}>{t('ACCOUNT', 'Account')}</SectionTitle>
        <RowsCard trailing={withLanguage ? languageRow(rows.length > 0) : undefined}>
          {rows.map((row) => (
            <ProfileRow
              key={row.key}
              testID={`profile-row-${row.key}`}
              icon={row.icon}
              title={row.title}
              value={row.value}
              onPress={row.onPress}
            />
          ))}
        </RowsCard>
      </View>
    );
  };

  const renderLanguage = () => isVisible('account')
    ? null
    : (
      <View style={languageShown ? undefined : styles.none} testID='profile-language'>
        <RowsCard trailing={languageRow(false)} />
      </View>
    );

  // The remove link is quiet on purpose: a destructive action is not the page's loudest thing.
  const renderDeleteAccount = () => allowDeleteDriverAccount && (
    <View style={styles.remove}>
      <OLink
        testID='profile-remove-account'
        variant='danger'
        disabled={isAdmin}
        shorcut={t('REMOVE_ACCOUNT', 'Remove account')}
        onPress={() => setOpenRemoveAccount(true)}
      />
    </View>
  );

  const renderLogout = () => <LogoutButton setRootState={props.setRootState} />;

  // The sections the theme shows, in its order; a hidden or empty one draws nothing and leaves no gap.
  const sections = render({
    profile_photo: renderPhoto,
    availability: renderAvailability,
    information: renderInformation,
    account: renderAccount,
    language: renderLanguage,
    logout: renderLogout,
    delete_account: renderDeleteAccount,
  }).filter(Boolean);

  return (
    <View style={styles.page}>
      <ONavbar title={t('PROFILE', 'Profile')} />
      {validationFields?.error && !loading && (
        <View style={styles.content}>
          <NotFoundSource
            content={
              validationFields?.error?.[0] ||
              validationFields?.error?.[0]?.message ||
              t('NETWORK_ERROR', 'Network Error')
            }
            conditioned={false}
            onClickButton={() => loadOriginalValidationFields({ forceLoading: true })}
            btnTitle={t('REFRESH_PROFILE', 'Refresh profile')}
          />
        </View>
      )}

      {isLoading && !validationFields.error && <ProfileSkeleton />}

      {!isLoading && !validationFields.error && (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.content}
          >
            {sections}
          </ScrollView>
          <ProfilePhotoSheet
            open={openPhotoSheet}
            onClose={() => setOpenPhotoSheet(false)}
            onTakePhoto={takePhoto}
            onChooseFromGallery={chooseFromGallery}
            hasPhoto={!!user?.photo}
            onRemovePhoto={handleRemovePhoto}
          />
          <RemoveAccountModal
            open={openRemoveAccount}
            onClose={() => setOpenRemoveAccount(false)}
            onConfirm={onRemoveAccountConfirmed}
          />
        </>
      )}
    </View>
  );
};

export const UserProfileForm = (props: any) => {
  const profileProps = {
    ...props,
    UIComponent: ProfileUI,
  };

  return <UserProfileController {...profileProps} />;
};
