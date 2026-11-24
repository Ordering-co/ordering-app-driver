import * as React from 'react';
import { Linking, Pressable, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeTextStyle, themeControlHeight } from '@/theme/helpers';
import { useLanguage } from '@components';
import OText from './OText';
import OButton from './OButton';
import { useNotice } from './confirmAction';
import { opensWithoutAsking } from '../../utils/links';

interface Props {
  /** The address the link opens; not needed with `onPress`. */
  url?: string | undefined;
  /** What the link does, in place of opening `url`. */
  onPress?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'danger';
  testID?: string;
  shorcut: string;
  color?: string;
  PressStyle?: TextStyle;
  TextStyle?: TextStyle;
  type?: string;
  hasButton?: boolean;
  numberOfLines?: number;
  onTextLayout?: (e : any) => void;
}


const OLink = (props: Props): React.ReactElement => {
  const { url, onPress, disabled, size = 'md', variant = 'default', testID, shorcut, color, PressStyle, TextStyle, hasButton, numberOfLines, onTextLayout } = props;
  const [, t] = useLanguage();
  // `components.link`: its color, its `md` text and its pressed look.
  const theme: any = useTheme();
  const styles = React.useMemo(() => {
    const link = theme.native.components.link
    const look = link.variants[variant] ?? link.variants.default
    const text = nativeTextStyle(link.sizes[size].text)
    // Anything tappable has a 44 pt touch target: a line of text grows its touch area, not its look.
    const slop = Math.max(0, Math.ceil((themeControlHeight(theme, 'md') - text.lineHeight) / 2))
    return {
      slop: { top: slop, bottom: slop },
      ...StyleSheet.create({
        text: {
          ...text,
          color: look.color ?? link.base.color,
          ...(link.base.underline === 'always' && { textDecorationLine: 'underline' as const }),
        },
        pressed: { opacity: look.states.pressed.opacity },
        disabled: { color: look.states.disabled.color },
      }),
    }
  }, [theme, size, variant]);

  // A link that cannot be opened says so in the app's dialog (never a system alert).
  const notify = useNotice();
  const handleAlert = () =>
    notify({
      title: t('ERROR_OPENING_THE_LINK', 'Error opening the link'),
      message: t('LINK_UNSUPPORTED', 'Link could not be opened or is not supported'),
    });

  const handleInvalidNumberAlert = () =>
    notify({
      title: t('ERROR_OPENING_THE_LINK', 'Error opening the link'),
      message: t('INVALID_NUMBER', 'Invalid number'),
    });

  const handleOpenUrl = async (breakFunction = false) => {
    if (breakFunction) {
      return
    }
    if (!url) {
      handleAlert();
      return;
    }

    try {
      if (url.includes('tel:') && url.includes('invalid')) {
        handleInvalidNumberAlert()
      } else if (opensWithoutAsking(url) || await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        handleAlert();
      }
    } catch (err) {
      handleAlert();
    }
  };

  return (
    <Pressable
      style={PressStyle}
      testID={testID}
      disabled={disabled}
      hitSlop={styles.slop}
      onPress={() => onPress ? onPress() : handleOpenUrl(hasButton)}
      accessibilityRole='link'
      accessibilityState={{ disabled: !!disabled }}
    >
      {({ pressed }) => hasButton ? (
        <OButton onClick={() => onPress ? onPress() : handleOpenUrl()} text={shorcut} disabled={disabled} />
      ) : (
        <OText
          style={[styles.text, pressed && styles.pressed, disabled && styles.disabled, TextStyle]}
          numberOfLines={numberOfLines ?? 1}
          ellipsizeMode="tail"
          color={color}
          onTextLayout={onTextLayout}
        >
          {shorcut}
        </OText>
      )}
    </Pressable>
  );
};

export default OLink;
