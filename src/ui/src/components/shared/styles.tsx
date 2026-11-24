import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import OButton from './OButton';
import Icon from './Icon';
import { useLanguage } from '@components';
import { themeIconSize, type IconLevel } from '@/theme/helpers';

/**
 * The icon buttons of modals, sheets and the header (close, back): the `close`
 * slot of `components.modal` (an icon button of the theme, 44 pt to touch).
 */
export const ModalCloseButton = ({ onPress, style, testID, icon = 'close', iconSize, accessibilityLabel }: { onPress?: () => void, style?: ViewStyle, testID?: string, icon?: string, iconSize?: IconLevel, accessibilityLabel?: string }) => {
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const slot = theme.native.components.modal.slots.close;
  return (
    <OButton
      iconOnly
      color={slot.color}
      appearance={slot.appearance}
      size={slot.size}
      icon={<Icon name={icon} size={iconSize} />}
      onClick={onPress}
      style={style}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? t('CLOSE', 'Close')}
    />
  );
};

/**
 * How far an icon button's touch box reaches past its glyph on each side: half the difference between the box and the
 * icon scale's standard glyph (`icon.md`, the glyph every board centers in its 44 box when it pulls a button to the
 * edge). A host that wants the glyph (not the box) on an edge pulls the button in by this much: the back button on
 * the left, the actions of a bar and the sheets' close on the right.
 */
export const closeButtonInset = (theme: any): number => {
  const slot = theme.native.components.modal.slots.close;
  const size = theme.native.components.button.sizes[slot.size];
  return (size.height - themeIconSize(theme, 'md')) / 2;
};

/**
 * The back button of every header: the same slot with the back glyph (`icon.lg`, larger than the other glyphs of a
 * bar), pulled into the page side so its glyph, not its touch box, starts at the gutter, where every text and card of
 * the screen starts. Its host lays it at the gutter.
 */
export const BackButton = ({ onPress, testID, accessibilityLabel }: { onPress?: () => void, testID?: string, accessibilityLabel?: string }) => {
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const pull = React.useMemo(() => ({ marginLeft: -closeButtonInset(theme) }), [theme]);
  return (
    <View style={pull}>
      <ModalCloseButton onPress={onPress} icon='arrow-back' iconSize='lg' testID={testID} accessibilityLabel={accessibilityLabel ?? t('GO_BACK', 'Go back')} />
    </View>
  );
};
