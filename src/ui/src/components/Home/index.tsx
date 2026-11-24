import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  DeviceEventEmitter,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from 'styled-components/native';

import { _setStoreData } from '../../providers/StoreUtil';
import { BackgroundImage, Overlay } from './styles';
import { AUTH_FIELD_SCOPE } from '../LoginForm/AuthPieces';
import { LanguageSelector } from '../LanguageSelector';
import { usePageSections } from '@/theme/sections';
import { nativeTextStyle, themeControlHeight, themeImage, themePart, themeSpace } from '@/theme/helpers';

import { useLanguage, useApi } from '@components';
import { FieldError, KeyboardScreen, OButton, OIcon, OText, OInput } from '../shared';

/** `home_hero.base.title_align` / `content_align` as React Native takes them. */
const TEXT_ALIGN: Record<string, 'auto' | 'center' | 'right'> = { start: 'auto', center: 'center', end: 'right' }
const ITEMS_ALIGN: Record<string, 'flex-start' | 'center' | 'flex-end'> = { start: 'flex-start', center: 'center', end: 'flex-end' }
/** The logotype's box: as wide as its image asks (4:1, docs/theme/pages-and-visibility.md §3). */
const LOGOTYPE_RATIO = 4

/**
 * The welcome screen: `components.home_hero` over the theme's `home_hero`
 * image, with the sections of the page `home` in the theme's order (`logo`,
 * `title`: the title and its text, `login_account`: the login button and, in
 * multi-project builds, the project's name). The language, when the project
 * has more than one, is a button at the end of the logo's row (or alone at the
 * top when the theme hides the logo); the keyboard lifts the whole screen.
 */
type HomeValues = { project_name: string };

export const Home = (props: any) => {
  const { onNavigationRedirect, useRootPoint } = props;

  const theme: any = useTheme();
  const insets = useSafeAreaInsets();
  const [ordering, { setOrdering }] = useApi();
  const [, t] = useLanguage();
  const { control, handleSubmit, formState: { errors } } = useForm<HomeValues>();
  const { render, isVisible } = usePageSections('home');

  const hero = theme.native.components.home_hero;
  const logoHeight = themeControlHeight(theme, 'md');
  const styles = useMemo(() => {
    const field = theme.native.components.field.base;
    const align = TEXT_ALIGN[hero.base.title_align];
    return StyleSheet.create({
      screen: { flex: 1, width: '100%' },
      scroll: { flex: 1, width: '100%' },
      // The safe area, at least the page's vertical rhythm. On Android the inset is the navigation bar the content
      // stands on: the last element keeps the page's bottom space (`account_page.padding_bottom`, the one every
      // other screen's last element has) above it, never flush with it. iOS's inset is the home indicator, inside
      // the screen: its bottom is the larger of the two, as it always was.
      content: {
        flexGrow: 1,
        alignItems: ITEMS_ALIGN[hero.base.content_align],
        paddingHorizontal: hero.base.padding_x,
        paddingTop: Math.max(insets.top, themeSpace(theme, 'lg')),
        paddingBottom: Platform.OS === 'android'
          ? themePart(theme, 'account_page', 'base.padding_bottom') + insets.bottom
          : Math.max(insets.bottom, themeSpace(theme, 'lg')),
        gap: themeSpace(theme, 'lg'),
      },
      block: { alignSelf: 'stretch' },
      // The bar of the screen: the logo at its start, the language at its end, as tall as every bar.
      header: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: themePart(theme, 'header', 'base.height'),
        gap: themeSpace(theme, 'sm'),
      },
      language: { marginStart: 'auto' },
      // The bar of a hidden logo and a single language has nothing to draw: it takes no room.
      empty: { display: 'none' },
      // What follows the logo sits at the bottom of the screen.
      bottom: { marginTop: 'auto' },
      title: { ...nativeTextStyle(hero.base.title), color: hero.base.title_color, textAlign: align },
      text: { color: hero.base.title_color, textAlign: align },
      login: { alignSelf: 'stretch', gap: field.gap },
      // The field's error in the hero's ink: it is read over the photo.
      error: { color: hero.base.title_color },
    });
  }, [theme, hero, insets.top, insets.bottom]);

  // Whether the language button is there (the project may have only one language).
  const [languageShown, setLanguageShown] = useState(false)
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

  const hasErrors = Object.keys(errors).length > 0;

  // The language sheet is the profile's: the same controller, so a change there is a change here.
  const renderLanguage = () => (
    <View style={styles.language}>
      <LanguageSelector variant='pill' onShownChange={setLanguageShown} />
    </View>
  );

  const renderLogo = () => (
    <View style={styles.header}>
      <OIcon
        src={themeImage(theme, 'logotype')}
        width={logoHeight * LOGOTYPE_RATIO}
        height={logoHeight}
      />
      {renderLanguage()}
    </View>
  );

  const renderTitle = () => (
    <View style={[styles.block, styles.bottom]}>
      <OText style={styles.title}>
        {t('HOME_HERO_TITLE', 'Your deliveries, in one place')}
      </OText>
      <OText preset='body_lg' style={styles.text}>
        {t('HOME_HERO_SUBTITLE', 'Sign in to see your orders')}
      </OText>
    </View>
  );

  const renderLoginAccount = () => (
    <View testID='home-login-account' style={[styles.login, !isVisible('title') && styles.bottom]}>
      {useRootPoint && (
        <View>
          <Controller
            control={control}
            name='project_name'
            rules={{ required: t(`VALIDATION_ERROR_PROJECT_NAME_REQUIRED`, 'The field project name is required') }}
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <OInput
                name='project_name'
                scope={AUTH_FIELD_SCOPE}
                labelColor={hero.base.title_color}
                placeholder={t('PROJECT_NAME', 'Project Name')}
                hasError={hasErrors}
                onChange={(e: any) => {
                  const project = e?.target?.value?.replace(/\s/g, '')
                  onChange(project)
                }}
                value={value}
                returnKeyType='done'
                autoCorrect={false}
                autoCapitalize='none'
                blurOnSubmit={false}
                onSubmitEditing={() => handleSubmit(onSubmit)()}
                isValueSync
              />
            )}
          />
          {hasErrors && (
            <FieldError scope={AUTH_FIELD_SCOPE} style={styles.error} testID='home-project-error'>
              {errors.project_name?.message}
            </FieldError>
          )}
        </View>
      )}
      <OButton
        text={useRootPoint ? t('SET_PROJECT', 'Set project') : t('LOGIN', 'Login')}
        color={hero.slots.login.color}
        appearance={hero.slots.login.appearance}
        size={hero.slots.login.size}
        loading={isLoadingProject}
        onClick={() => useRootPoint ? handleSubmit(onSubmit)() : onNavigationRedirect('Login')}
      />
    </View>
  );

  return (
    <BackgroundImage
      source={themeImage(theme, 'home_hero')}
      resizeMode="cover"
    >
      <Overlay />
      <KeyboardScreen
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {/* With no logo to carry it, the language keeps the top of the screen. */}
          {!isVisible('logo') && <View style={[styles.header, !languageShown && styles.empty]}>{renderLanguage()}</View>}
          {render({
            logo: renderLogo,
            title: renderTitle,
            login_account: renderLoginAccount,
          })}
        </ScrollView>
      </KeyboardScreen>
    </BackgroundImage>
  );
};
