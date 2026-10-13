import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  DeviceEventEmitter,
  ScrollView,
  Keyboard,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from 'styled-components/native';

import { _setStoreData } from '../../providers/StoreUtil';
import { LogoWrapper, Container, BackgroundImage, FormInput, WrapperContainer } from './styles';

import { useLanguage, useApi } from '@components';
import { OButton, OIcon, OText, OInput } from '../shared';

export const Home = (props: any) => {
  const { onNavigationRedirect, useRootPoint } = props;

  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [ordering, { setOrdering }] = useApi();
  const [, t] = useLanguage();
  const { control, handleSubmit, errors } = useForm();

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const styles = StyleSheet.create({
    logo: {
      height: 40,
      width: 180,
    },
    wrapperContent: {
      width: '100%',
    },
    wrapperText: {
      marginBottom: 20,
    },
    textTitle: {
      fontSize: 36,
      fontFamily: theme.fonts.special.name,
      fontWeight: '600',
    },
    textSubtitle: {
      fontWeight: '300',
      fontFamily: theme.fonts.special.name,
      fontSize: 16,
    },
    wrapperBtn: {
      marginBottom: 20
    },
    btn: {
      borderRadius: 7.6,
      marginTop: 20,
    },
    btnText: {
      fontSize: 16,
    },
    input: {
      borderWidth: 1,
      borderRadius: 7.6,
      borderColor: Object.keys(errors).length > 0 ? theme.colors.error : theme.colors.white,
      backgroundColor: theme.colors.transparent,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.black,
      opacity: 0.4,
    },
  });

  const handleKeyboardShow = useCallback((e: KeyboardEvent) => {
    const h = e.endCoordinates?.height ?? 0;
    setKeyboardInset(h);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleKeyboardHide = useCallback(() => {
    setKeyboardInset(0);
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvent, handleKeyboardShow);
    const subHide = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [handleKeyboardShow, handleKeyboardHide]);

  const handleProjectInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 250);
  }, []);

  const [projectName, setProjectName] = useState<any>(null)
  const [isLoadingProject, setLoadingProject] = useState(false)

  const onSubmit = (values: any) => {
    setLoadingProject(true)
    setProjectName(values)
    setOrdering({ ...ordering, project: values?.project_name })
    DeviceEventEmitter.emit('change_project', { setted: !!values?.project_name, changed: !!values?.project_name })
    _setStoreData('project_name', values?.project_name)
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setProjectName(null)
      setLoadingProject(false)
    }
  }, [errors])

  useEffect(() => {
    if (ordering?.project === projectName?.project_name) {
      setLoadingProject(false)
      onNavigationRedirect('Login')
    }
  }, [ordering])

  return (
    <Container>
      <BackgroundImage
        source={theme.images.backgroundsImages.login}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <WrapperContainer>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: insets.top,
              paddingBottom: keyboardInset > 0 ? keyboardInset + 16 : Math.max(insets.bottom, 20),
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <LogoWrapper>
              <OIcon src={theme.images.logos.logotypeInvert} style={styles.logo} />
            </LogoWrapper>
            <View style={styles.wrapperContent}>
            <View style={styles.wrapperText}>
              <OText style={styles.textTitle} color={theme.colors.inputChat}>
                {t('MANAGE_YOUR_BUSINESS', 'Manage your business')}
              </OText>
              <OText style={styles.textSubtitle} color={theme.colors.inputChat}>
                {t(props.title.key, props.title.value)}
              </OText>
            </View>
            <>
              {useRootPoint && (
                <FormInput>
                  <Controller
                    control={control}
                    name='project_name'
                    rules={{ required: t(`VALIDATION_ERROR_PROJECT_NAME_REQUIRED`, 'The field project name is required') }}
                    defaultValue=""
                    render={({ onChange, value }: any) => (
                      <OInput
                        name='project_name'
                        placeholderTextColor={theme.colors.white}
                        placeholder={t('PROJECT_NAME', 'Project Name')}
                        onChange={(e: any) => {
                          const project = e?.target?.value?.replace(/\s/g, '')
                          onChange(project)
                        }}
                        selectionColor={theme.colors.primary}
                        color={theme.colors.white}
                        borderColor={theme.colors.white}
                        value={value}
                        style={styles.input}
                        returnKeyType='done'
                        autoCorrect={false}
                        autoCapitalize='none'
                        blurOnSubmit={false}
                        onSubmitEditing={() => handleSubmit(onSubmit)()}
                        onFocus={handleProjectInputFocus}
                        isValueSync
                      />
                    )}
                  />
                </FormInput>
              )}
              {Object.keys(errors).length > 0 && (
                <OText
                  color={theme.colors.white}
                  style={{ alignSelf: 'center', marginTop: 5 }}
                >
                  {errors['project_name'].message}
                </OText>
              )}
              <View style={styles.wrapperBtn}>
                <OButton
                  text={useRootPoint ? t('SET_PROJECT', 'Set project') : t('LOGIN', 'Login')}
                  textStyle={{
                    ...styles.btnText,
                    color: theme.colors.inputTextColor,
                  }}
                  bgColor={theme.colors.primary}
                  borderColor={theme.colors.primary}
                  isLoading={isLoadingProject}
                  style={styles.btn}
                  imgRightSrc={false}
                  onClick={() => useRootPoint ? handleSubmit(onSubmit)() : onNavigationRedirect('Login')}
                />
              </View>
            </>
            </View>
          </ScrollView>
        </WrapperContainer>
      </BackgroundImage>
    </Container>
  );
};
