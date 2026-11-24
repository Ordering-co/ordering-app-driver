import * as React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { themeColor, themeFontFamily, themeText, themeValue, type TextPreset } from '@/theme/helpers';

/**
 * The app's text. Its look comes from a typography preset of the theme
 * (`h1`…`h4`, `body_lg`, `body`, `body_sm`, `caption`, `label`, `button`) and a
 * color role (`text`, `text_muted`, `primary`, …). A weight is painted with the
 * font file of that weight, never with `fontWeight` (Android fakes bold).
 *
 *   <OText preset='h3'>Title</OText>
 *   <OText preset='body_sm' color='text_muted' weight={600}>Meta</OText>
 */

const isRole = (theme: any, color?: string) => !!color && theme.native.tokens.color[color] !== undefined;

interface Props {
  /** A typography preset of the theme (`body` by default). */
  preset?: TextPreset;
  /** A color role of the theme (`text` by default), or a color the theme gave (a component's own). */
  color?: string;
  /** A weight kept over the preset's own (400, 500, 600, 700, 'bold', 'normal'). */
  weight?: number | string;
  align?: 'center' | 'left' | 'right';
  style?: TextStyle | Array<TextStyle | false | null | undefined>;
  children?: React.ReactNode;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  onTextLayout?: any;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityRole?: 'text' | 'link' | 'header' | 'button' | 'alert';
  accessibilityLabel?: string;
  testID?: string;
  adjustsFontSizeToFit?: boolean;
  /** A lower limit than the app's for a text in a box of a fixed height (the header's). */
  maxFontSizeMultiplier?: number;
  selectable?: boolean;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

/** How far a text of the app follows the system's font size. */
export const TEXT_SCALE_LIMIT = 1.3;

// Layout only (no theme values): safe at module level.
const layout = StyleSheet.create({ wrap: { flexWrap: 'wrap' } });

const OText = ({ preset = 'body', color, weight, align, style, children, ...rest }: Props): React.ReactElement => {
  const theme: any = useTheme();

  // A fontWeight in the style is a weight: painted with its file.
  const flat: TextStyle = StyleSheet.flatten(style) ?? {};
  const { fontWeight: styleWeight, ...styleRest } = flat;
  // Only a font file of the theme is a family: the theme's font paints every text.
  const themed = (role: 'heading' | 'body') => Object.values(theme.native.fonts[role]?.files ?? {}).includes(styleRest.fontFamily);
  if (styleRest.fontFamily && !themed('heading') && !themed('body')) delete styleRest.fontFamily;
  const kept = weight ?? styleWeight;
  const weightValue = typeof kept === 'string' && /^\d+$/.test(kept) ? Number(kept) : kept;

  const text: TextStyle = themeText(theme, preset, weightValue !== undefined ? { weight: weightValue } : {});
  // A `weight` prop over a style that brings its own font file (a component's
  // text look) paints that look's font at the weight: the prop is not lost.
  if (weight !== undefined && weight !== null && styleRest.fontFamily) {
    styleRest.fontFamily = themeFontFamily(theme, themed('heading') ? 'heading' : 'body', weightValue as number | string) ?? styleRest.fontFamily;
  }
  // A size of the style's own (a component's custom text) keeps the preset's
  // line ratio when it brings no line height, so its lines are never clipped.
  const sizeStyle: TextStyle = styleRest.fontSize !== undefined && styleRest.fontSize !== text.fontSize && styleRest.lineHeight === undefined
    ? { lineHeight: Math.round(styleRest.fontSize * themeValue(theme, `tokens.typography.${preset}.line`)) }
    : {};

  return (
    <Text
      maxFontSizeMultiplier={TEXT_SCALE_LIMIT}
      {...rest}
      style={[
        text,
        sizeStyle,
        { color: isRole(theme, color) ? themeColor(theme, color as string) : color ?? themeColor(theme, 'text') },
        layout.wrap,
        align ? { textAlign: align } : null,
        styleRest,
      ]}
    >
      {children}
    </Text>
  );
};

export default OText;
