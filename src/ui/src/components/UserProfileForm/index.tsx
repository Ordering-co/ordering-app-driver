import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, TouchableOpacity } from 'react-native';
import { useForm } from 'react-hook-form';
import { launchImageLibrary } from 'react-native-image-picker';
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder';
import { useTheme } from 'styled-components/native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign'
import ToggleSwitch from 'toggle-switch-react-native';

import {
  CenterView,
  Actions,
  UserData,
  EditButton,
  EnabledStatusDriver
} from './styles';
import { UDWrapper } from '../UserFormDetails/styles';
import { ProfileParams } from '../../types';
import { _retrieveStoreData, _clearStoreData } from '../../providers/StoreUtil';
import { sortInputFields, getTraduction } from '../../utils';

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
  OIcon,
  OIconButton,
  OText,
  OButton,
  OInput,
  OModal,
  OAlertOriginal,
  LogoutButton,
  LanguageSelector,
  UserFormDetailsUI,
  DriverSchedule,
  NotFoundSource
} from '@ui'

const ProfileUI = (props: ProfileParams) => {
  const {
    formState,
    isEdit,
    validationFields,
    handleButtonUpdateClick,
    toggleIsEdit,
    cleanFormState,
    handleToggleAvalaibleStatusDriver,
    handleRemoveAccount,
    isShowDriverStatus,
    navigation
  } = props;

  const [{ user, sessionLoading }] = useSession();
  const [, t] = useLanguage();
  const [, { showToast }] = useToast();
  const [{ optimizeImage }] = useUtils();
  const [{ configs }] = useConfig();
  const [{ loading }, { loadOriginalValidationFields }] = useValidationFields()
  const { errors } = useForm();
  const theme = useTheme();

  const [confirm, setConfirm] = useState<any>({
    open: false,
    content: null,
    handleOnAccept: null,
    id: null,
    title: null
  });
  const [phoneInputData, setPhoneInputData] = useState<any>({
    error: '',
    phone: {
      country_phone_code: null,
      cellphone: null,
    },
  });
  const [phoneUpdate, setPhoneUpdate] = useState(false);
  const [userState, setUserState] = useState(props.userState)
  const [userPhoneNumber, setUserPhoneNumber] = useState<any>(null);
  const [phoneToShow, setPhoneToShow] = useState('');
  const [openModal, setOpenModal] = useState(false)
  const allowDriverUpdateData = user?.level !== 4 || configs?.allow_driver_update_data?.value === "1"
  const allowDeleteDriverAccount = user?.level !== 4 || configs?.allow_delete_driver_account?.value === "1"
  const isAdmin = user?.level === 0

  const setUserCellPhone = (isEdit = false) => {
    if (userPhoneNumber && !userPhoneNumber.includes('null') && !isEdit) {
      setUserPhoneNumber(userPhoneNumber);
      return;
    }
    if (user?.cellphone) {
      let phone = null;
      if (user?.country_phone_code) {
        phone = `+${user?.country_phone_code} ${user?.cellphone}`;
      } else {
        phone = user?.cellphone;
      }
      setUserPhoneNumber(phone);
      setPhoneInputData({
        ...phoneInputData,
        phone: {
          country_phone_code: user?.country_phone_code || null,
          cellphone: user?.cellphone || null,
        },
      });
      return;
    }
    setUserPhoneNumber(user?.cellphone || '');
  };

  const handleImagePicker = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxHeight: 200,
        maxWidth: 200,
        includeBase64: true,
      },
      (image: any) => {
        const response = image?.assets?.[0];
        if (response?.didCancel) {
          console.log('User cancelled image picker');
        } else if (response?.errorMessage) {
          console.log('ImagePicker Error: ', response.errorMessage);
          showToast(ToastType.Error, response.errorMessage);
        } else {
          if (response?.uri) {
            const url = `data:${response.type};base64,${response.base64}`;
            handleButtonUpdateClick(null, true, url);
          } else {
            showToast(ToastType.Error, t('IMAGE_NOT_FOUND', 'Image not found'));
          }
        }
      },
    );
  };

  const handleCancelEdit = () => {
    cleanFormState({ changes: {} });
    toggleIsEdit();
    setPhoneInputData({
      error: '',
      phone: {
        country_phone_code: null,
        cellphone: null,
      },
    });
  };

  const onRemoveAccount = async () => {
    setConfirm({
      open: true,
      content: [t('QUESTION_REMOVE_ACCOUNT', 'Are you sure that you want to remove your account?')],
      title: t('ACCOUNT_ALERT', 'Account alert'),
      handleOnAccept: () => {
        setConfirm({ ...confirm, open: false })
        handleRemoveAccount && handleRemoveAccount(user?.id)
        _clearStoreData({ excludedKeys: ['isTutorial', 'language'] });
        props?.setRootState && props?.setRootState({ isAuth: false, token: null })
      }
    })
  }

  useEffect(() => {
    if (phoneInputData.phone.cellphone) {
      const codeNumberPhone = phoneInputData.phone.country_phone_code
      const numberPhone = phoneInputData.phone.cellphone
      setPhoneToShow(`(${codeNumberPhone}) ${numberPhone}`);
    }
  }, [phoneInputData.phone.cellphone]);

  useEffect(() => {
    const isLoadingDriver = userState?.loadingDriver ?? true;

    if (userState?.result?.result && !isLoadingDriver) {
      if (userState?.result?.error) {
        const messageError =
          userState.result.error || userState.result.error[0];
        showToast(ToastType.Error, getTraduction(messageError, t));
      } else {
        showToast(
          ToastType.Success,
          t('AVAILABLE_STATE_IS_UPDATED', 'Available state is updated'),
        );
      }
    }
  }, [userState?.loadingDriver]);

  useEffect(() => {
    if ((user || !isEdit) && !formState?.loading) {
      setUserCellPhone();
      if (!isEdit && !formState?.loading) {
        cleanFormState && cleanFormState({ changes: {} });
        setUserCellPhone(true);
      }
    }
  }, [user, isEdit]);

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
    if (Object.keys(errors).length > 0) {
      // Convert all errors in one string to show in toast provider
      const list = Object.values(errors);
      let stringError = '';
      list.map((item: any, i: number) => {
        stringError +=
          i + 1 === list.length ? `- ${item.message}` : `- ${item.message}\n`;
      });
      showToast(ToastType.Error, stringError);
    }
  }, [errors]);

  useEffect(() => {
    if (user?.cellphone && !user?.country_phone_code) {
      setPhoneUpdate(true);
    } else {
      setPhoneUpdate(false);
    }
  }, [user?.country_phone_code]);

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

  const styles = StyleSheet.create({
    label: {
      color: theme.colors.textGray,
      fontWeight: '700',
    },
    inputStyle: {
      marginVertical: 10,
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: theme.colors.tabBar,
      borderTopWidth: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderRadius: 10,
    },
    editButton: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.white,
      marginBottom: 25,
    },
    btnText: {
      color: theme.colors.yellow,
      fontSize: 14,
    },
    header: {
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 15,
    },
    sectionTitle: {
      fontFamily: theme.fonts.special.name,
      fontWeight: '700',
      fontSize: 26,
      color: theme.colors.textGray,
    },
    button: {
      marginBottom: 10,
      borderRadius: 10,
      padding: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 60,
      backgroundColor: theme.colors.gray100,
    }
  });

  return (
    <>
      <View style={styles.header}>
        <OText style={styles.sectionTitle}>{t('PROFILE', 'Profile')}</OText>
      </View>
      {validationFields?.error && !loading && (
        <NotFoundSource
          content={
            validationFields?.error?.[0] ||
            validationFields?.error?.[0]?.message ||
            t('NETWORK_ERROR', 'Network Error')
          }
          image={theme.images.general.notFound}
          conditioned={false}
          onClickButton={() => loadOriginalValidationFields({ forceLoading: true })}
          btnTitle={t('REFRESH_PROFILE', 'Refresh profile')}
        />
      )}

      {(formState?.loading || sessionLoading) && !validationFields.error && (
        <View
          style={{
            backgroundColor: theme.colors.backgroundLight,
          }}>
          <Placeholder Animation={Fade}>
            <PlaceholderLine
              width={20}
              style={{
                alignSelf: 'center',
                borderRadius: 20,
                width: 120,
                height: 120,
              }}
            />

            <PlaceholderLine
              width={20}
              style={{
                alignSelf: 'center',
                borderRadius: 20,
                width: 20,
                height: 20,
              }}
            />
          </Placeholder>

          {[...Array(8)].map((item, i) => (
            <Placeholder key={i} Animation={Fade}>
              <View style={{ flexDirection: 'row' }}>
                <Placeholder>
                  <PlaceholderLine width={40} style={{ marginTop: 30 }} />

                  <PlaceholderLine width={100} />
                </Placeholder>
              </View>
            </Placeholder>
          ))}

          <Placeholder Animation={Fade}>
            <PlaceholderLine
              width={30}
              style={{
                marginTop: 20,
                alignSelf: 'center',
                height: 44,
                borderRadius: 7.6,
              }}
            />

            <PlaceholderLine
              width={100}
              style={{
                marginTop: 20,
                height: 33,
                borderRadius: 7.6,
              }}
            />

            <PlaceholderLine
              width={40}
              style={{
                marginTop: 5,
                height: 15,
                borderRadius: 7.6,
              }}
            />
          </Placeholder>
        </View>
      )}

      {!(formState?.loading || sessionLoading) && !validationFields.error && (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <CenterView>
            <TouchableOpacity onPress={() => handleImagePicker()}>
              <OIcon
                url={optimizeImage(user?.photo, 'h_300,c_limit')}
                src={!user?.photo && theme.images.general.user}
                width={123}
                height={123}
                style={{ borderRadius: 123, borderWidth: 1, borderColor: theme.colors.gray100 }}
              />
            </TouchableOpacity>
          </CenterView>

          {user?.level === 4 && (
            <EnabledStatusDriver>
              <View style={{ flex: 1 }}>
                <OText
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  style={{ ...styles.label, paddingHorizontal: 0 }}>
                  {t(
                    `${!isShowDriverStatus ? 'NOT_' : ''}AVAILABLE_TO_RECEIVE_ORDERS`,
                    `${!isShowDriverStatus ? 'You are not ' : ''}Available to receive orders`
                  )}
                </OText>
              </View>

              {isShowDriverStatus && (
                <>
                  {userState.loadingDriver ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <ToggleSwitch
                      isOn={userState?.result?.result?.available}
                      onColor={theme.colors.primary}
                      offColor={theme.colors.offColor}
                      size="small"
                      onToggle={() =>
                        handleToggleAvalaibleStatusDriver &&
                        handleToggleAvalaibleStatusDriver(
                          !userState?.result?.result?.available,
                        )
                      }
                      disabled={userState?.loadingDriver}
                      animationSpeed={200}
                    />
                  )}
                </>
              )}
            </EnabledStatusDriver>
          )}

          {!isEdit && !validationFields.error ? (
            <UserData>
              {!validationFields?.loading &&
                sortInputFields({ values: validationFields?.fields?.checkout })
                  .length > 0 && (
                  <UDWrapper>
                    {sortInputFields({
                      values: validationFields.fields?.checkout,
                    }).map((field: any) => (
                      <React.Fragment key={field.id}>
                        <OText style={styles.label}>
                          {t(field?.code.toUpperCase(), field?.name)}
                        </OText>

                        <OInput
                          name={field.code}
                          placeholder={t(field.code.toUpperCase(), field?.name)}
                          placeholderTextColor={theme.colors.arrowColor}
                          style={styles.inputStyle}
                          icon={
                            field.code === 'email'
                              ? theme.images.general.email
                              : theme.images.general.user
                          }
                          autoCapitalize={
                            field.code === 'email' ? 'none' : 'sentences'
                          }
                          isDisabled={!isEdit}
                          value={
                            formState?.changes[field.code] ??
                            (user && user[field.code]) ??
                            ''
                          }
                          type={
                            field.code === 'email' ? 'email-address' : 'default'
                          }
                          returnKeyType="done"
                          selectionColor={theme.colors.primary}
                          color={theme.colors.textGray}
                        />
                      </React.Fragment>
                    ))}

                    <OText style={styles.label}>
                      {t('PASSWORD', 'Password')}
                    </OText>

                    <OInput
                      isSecured={true}
                      placeholder={'·············'}
                      placeholderTextColor={theme.colors.textGray}
                      style={styles.inputStyle}
                      isDisabled={true}
                      selectionColor={theme.colors.primary}
                      color={theme.colors.textGray}
                    />

                    <OText style={styles.label}>{t('PHONE', 'Phone')}</OText>
                    <OInput
                      isSecured={true}
                      placeholder={
                        phoneToShow || `${t('NOT_PHONE', 'Not Phone')}`
                      }
                      placeholderTextColor={theme.colors.textGray}
                      style={styles.inputStyle}
                      isDisabled={true}
                      selectionColor={theme.colors.primary}
                      color={theme.colors.textGray}
                    />
                  </UDWrapper>
                )}
            </UserData>
          ) : (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              <UserFormDetailsUI
                {...props}
                hideUpdateButton
                handleCancelEdit={handleCancelEdit}
                toggleIsEdit={toggleIsEdit}
              />
            </View>
          )}
          {!validationFields.loading && !isEdit && allowDriverUpdateData && (
            <EditButton>
              <OButton
                text={t('EDIT', 'Edit')}
                bgColor={theme.colors.yellowSecondary}
                borderColor={theme.colors.yellow}
                isDisabled={formState.loading}
                imgRightSrc={null}
                textStyle={styles.btnText}
                style={styles.editButton}
                onClick={toggleIsEdit}
              />
            </EditButton>
          )}
          <View style={{ marginBottom: 40, borderWidth: 2.5, borderColor: theme.colors.tabBar }} />
          {!props.isBusinessApp && (
            <Pressable style={styles.button} onPress={() => setOpenModal(true)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                <OText size={16}>{t('SCHEDULE', 'Schedule')}</OText>
                <AntDesignIcon size={18} name='right' color={theme?.colors?.textNormal} />
              </View>
            </Pressable>

          )}
          <Pressable style={styles.button} onPress={() => navigation.navigate('Sessions')}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <OText size={16}>{t('SESSIONS', 'Sessions')}</OText>
              <AntDesignIcon size={18} name='right' color={theme.colors.gray200} />
            </View>
          </Pressable>
          <View style={{ marginTop: 20, marginBottom: 20, borderWidth: 2.5, borderColor: theme.colors.tabBar }} />
          <Actions>
            <LanguageSelector />
            <LogoutButton setRootState={props.setRootState} />
          </Actions>
          {allowDeleteDriverAccount && (
            <OButton
              isDisabled={isAdmin}
              onClick={() => onRemoveAccount()}
              text={t('REMOVE_ACCOUNT', 'Remove account')}
              textStyle={{ fontSize: 16, lineHeight: 24, fontWeight: '700', color: theme.colors.danger500 }}
              style={{ marginTop: 10, marginBottom: 10 }}
              bgColor={theme.colors.white}
              borderColor={theme.colors.danger500}
            />
          )}
          <OModal
            open={openModal}
            onClose={() => setOpenModal(false)}
            entireModal
            hideIcons
            customClose
          >
            {!props.isBusinessApp && (
              <DriverSchedule schedule={user?.schedule} setOpenModal={setOpenModal} />
            )}
          </OModal>
          <OAlertOriginal
            open={confirm.open}
            title={confirm.title}
            content={confirm.content}
            onAccept={confirm.handleOnAccept}
            onCancel={() => setConfirm({ ...confirm, open: false, title: null })}
            onClose={() => setConfirm({ ...confirm, open: false, title: null })}
          />
        </ScrollView>
      )}
    </>
  );
};

export const UserProfileForm = (props: any) => {
  const profileProps = {
    ...props,
    UIComponent: ProfileUI,
  };

  return <UserProfileController {...profileProps} />;
};
