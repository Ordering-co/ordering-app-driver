import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';
import { themeSpace } from '@/theme/helpers';

import { Icon, ODivider, OButton, OSelect } from '../shared';
import { ProfileRow } from '../UserProfileForm/ProfileRow';
import { LanguageSelectorParams } from '../../types';
import { languageOwnName } from '../../utils';

import {
  LanguageSelector as LanguageSelectorController,
  useLanguage,
} from '@components';

interface Props extends LanguageSelectorParams {
  /** A line over the row, for the list it ends (the account's card): it is drawn with the row or not at all. */
  divided?: boolean;
  /** Tells the profile whether the row is on screen (the languages arrive late, and a project may have only one). */
  onShownChange?: (shown: boolean) => void;
  /**
   * What opens the sheet: `row`, the profile's account row (the default), or `pill`, a button over a photo
   * (the welcome screen's) with the globe and the current language's name.
   */
  variant?: 'row' | 'pill';
}

/**
 * The app's language, a row of the profile's account (`ProfileRow`) that shows the current language and
 * opens the languages in a sheet (`OSelect`, its rows after each language's own name ("Español", not the API's
 * "Spanish"; `languageOwnName`), a check on the current one). Nothing while the languages load or when there is only one. Either way it is the same
 * controller and the same sheet: choosing a language changes it as the profile's row does.
 */
const LanguageSelectorUI = (props: Props) => {
  const { languagesState, currentLanguage, handleChangeLanguage, divided, onShownChange, variant = 'row' } = props;

  const [, t] = useLanguage();
  const theme: any = useTheme();
  // The pill is drawn over the welcome photo: the fill is the hero's own overlay (`home_hero.base.overlay`, the
  // dark veil over that photo), translucent, not the button's opaque inverse fill. The button has no color role
  // for a fill over a photo, so its fill and its room (`md` at the sides, `xs` between the globe and the name, as the
  // board draws the pill) are set here; its text, icon and size are the button's, and it is `round`.
  const pillStyle = useMemo(() => StyleSheet.create({
    pill: { backgroundColor: theme.native.components.home_hero.base.overlay, paddingHorizontal: themeSpace(theme, 'md'), gap: themeSpace(theme, 'xs') },
  }).pill, [theme]);
  const languages: any[] = languagesState?.languages ?? [];
  const shown = !languagesState?.loading && languages.length > 1;

  useEffect(() => {
    onShownChange?.(shown);
  }, [shown, onShownChange]);

  if (!shown) return null;

  // A language is written in itself; a code the app has no name for keeps the API's.
  const nameOf = (language: any) => languageOwnName(language?.code, language?.name);
  const options = languages.map((language: any) => ({ value: language?.code, label: nameOf(language) }));
  const current = languages.find((language: any) => language?.code === currentLanguage);
  const currentName = current ? nameOf(current) : undefined;

  return (
    <>
      {divided && <ODivider />}
      <OSelect
        title={t('LANGUAGE', 'Language')}
        options={options}
        value={currentLanguage}
        onSelect={(code) => handleChangeLanguage(code)}
        renderTrigger={({ open }) => variant === 'pill' ? (
          <OButton
            testID='language-selector'
            color='inverse'
            size='md'
            round
            icon={<Icon name='globe-outline' />}
            text={currentName}
            accessibilityLabel={`${t('LANGUAGE', 'Language')}: ${currentName ?? ''}`}
            style={pillStyle}
            onClick={open}
          />
        ) : (
          <ProfileRow
            testID='language-selector'
            icon='globe-outline'
            title={t('LANGUAGE', 'Language')}
            value={currentName}
            onPress={open}
          />
        )}
      />
    </>
  );
};

export const LanguageSelector = (props: Props) => {
  const LanguageProps = {
    ...props,
    UIComponent: LanguageSelectorUI,
  };

  return <LanguageSelectorController {...LanguageProps} />;
};
