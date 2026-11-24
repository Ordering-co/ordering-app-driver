import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeBoxStyle, nativeTextStyle, themeSpace } from '@/theme/helpers';
import OText from './OText';
import Icon from './Icon';

/**
 * A notice box: `components.alert` (info, success, warning, danger), its
 * background, border, icon color and text. Not the system `Alert` dialog.
 *
 *   <ONotice variant='danger'>{t('ERROR', 'Error')}: {message}</ONotice>
 */
export type NoticeVariant = 'info' | 'success' | 'warning' | 'danger';

const ICONS: Record<NoticeVariant, string> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  danger: 'alert-circle-outline',
};

interface Props {
  variant?: NoticeVariant;
  children?: React.ReactNode;
  showIcon?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const ONotice = ({ variant = 'info', children, showIcon = true, style, testID }: Props) => {
  const theme: any = useTheme();
  const alert = theme.native.components.alert;
  const look = alert.variants[variant];
  const styles = React.useMemo(() => StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: alert.base.gap,
      // `sm` over and under, the theme's padding at the sides: a notice is a line or two, not a card.
      paddingVertical: themeSpace(theme, 'sm'),
      paddingHorizontal: alert.base.padding,
      borderRadius: alert.base.radius,
      ...nativeBoxStyle({ background: look.background, border: look.border, shadow: alert.base.shadow }),
    },
    text: { ...nativeTextStyle(alert.base.text), color: look.color, flex: 1 },
    content: { flex: 1 },
  }), [alert, look]);
  return (
    <View style={[styles.box, style]} testID={testID} accessibilityRole='alert'>
      {showIcon && <Icon name={ICONS[variant]} size={alert.base.icon_size} color={look.icon_color} />}
      {typeof children === 'string' || typeof children === 'number'
        ? <OText style={styles.text}>{children}</OText>
        : <View style={styles.content}>{children}</View>}
    </View>
  );
};

export default ONotice;
