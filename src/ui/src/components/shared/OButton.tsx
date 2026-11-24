import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeBoxStyle, nativeTextStyle, themeControlHeight, themePart } from '@/theme/helpers';
import Icon from './Icon';
import { TEXT_SCALE_LIMIT } from './OText';
import { HoldFill, HoldToConfirm, type HoldLayer } from './HoldToConfirm';

/**
 * The app's button: `components.button` of the theme. A button is a color
 * (`primary`, `secondary`, `danger`, `success`, `neutral`, `inverse`), an
 * appearance (`solid`, `outline`, `tonal`, `ghost`) and a size (`xs`, `sm`,
 * `md`, `lg`); the theme carries every combination with its pressed and
 * disabled states.
 *
 *   <OButton text='Continue' onClick={next} />
 *   <OButton text='Cancel' appearance='outline' size='sm' onClick={close} />
 *
 * `hold` makes `onClick` fire only after the finger has stayed on the button (`HoldToConfirm`): its
 * pressed look wipes in as the progress, a tap only says "Hold to confirm", and a screen reader gets a
 * confirmation dialog instead. Without it the button is exactly the plain one.
 *
 * `disabled` paints the button off and swallows the press. `onDisabledPress` makes a button that is off still answer a
 * tap, with that function and never with `onClick` (a held button included: no hold starts and no "Hold to confirm" is
 * said): for a button that is off for a reason the driver should be told. It stays off to the screen reader
 * (`accessibilityState.disabled`) and in its look, and a button that is `loading` takes no tap at all.
 */
export type ButtonColor = 'primary' | 'secondary' | 'danger' | 'success' | 'neutral' | 'inverse';
export type ButtonAppearance = 'solid' | 'outline' | 'tonal' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
const BUTTON_COLORS = ['primary', 'secondary', 'danger', 'success', 'neutral', 'inverse'] as const;
const BUTTON_APPEARANCES = ['solid', 'outline', 'tonal', 'ghost'] as const;
interface Props {
  text?: React.ReactNode;
  /** The text stays on one line and shrinks to fit (a button with a price beside a stepper). */
  fitText?: boolean;
  onClick?: (event?: any) => void;
  color?: ButtonColor;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  /** A square of the size's height with only `icon` (`shapes.icon`). */
  iconOnly?: boolean;
  /**
   * A button drawn round (`shapes.round`): an icon-only one is a circle (the chat's send, the profile's
   * camera); one with a label gets fully round ends, a pill (the order card's delivery position).
   */
  round?: boolean;
  /**
   * An icon before the text (or after it: `iconPosition='end'`), at the size's icon size (`button.sizes.<size>.icon_size`);
   * an icon-only button's is `button.shapes.icon.icon_size`. An `<Icon>` with a size of its own keeps it.
   */
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  /** Layout of the button in its row (a width, a flex): never its look. */
  style?: ViewStyle | ViewStyle[];
  /**
   * `onClick` fires when the hold completes, not on a tap: for an irreversible step a stray touch must
   * not take. Set it only where the tap would fire the action itself (a button that opens a sheet or a
   * form with its own submit asks nothing more).
   */
  hold?: boolean;
  /**
   * A button that is `disabled` still answers a tap, with this (it says why, a toast): it keeps the disabled look and the
   * disabled accessibility state, and `onClick` never runs. Ignored while the button is not disabled, and while it loads.
   */
  onDisabledPress?: (event?: any) => void;
}

/** What `HoldToConfirm` hands the plain button it draws (never a prop of the app's screens). */
type BodyProps = Props & { holdLayer?: HoldLayer };

/** The theme's color and appearance for a button's props. */
export const resolveButton = ({ color, appearance }: Pick<Props, 'color' | 'appearance'>) => {
  const known = <T extends string>(value: string | undefined, values: readonly T[]) => values.includes(value as T) ? value as T : undefined;
  return {
    color: known(color, BUTTON_COLORS) ?? 'primary',
    appearance: known(appearance, BUTTON_APPEARANCES) ?? 'solid',
  };
};

/** How far a label fitted to its box (`fitText`) may shrink: a share of its size, below which the text is cut instead. */
const FIT_MIN_SCALE = 0.8;

/** A state's look over the resting one: only what the state defines. */
const defined = (state: Record<string, any> | undefined) =>
  Object.fromEntries(Object.entries(state ?? {}).filter(([, value]) => value !== null && value !== undefined));

const ButtonBody = ({
  text,
  fitText,
  onClick,
  color,
  appearance,
  size = 'md',
  iconOnly = false,
  round = false,
  icon,
  iconPosition = 'start',
  loading = false,
  disabled = false,
  testID,
  accessibilityLabel,
  style,
  onDisabledPress,
  holdLayer,
}: BodyProps): React.ReactElement => {
  const theme: any = useTheme();
  const selection = resolveButton({ color, appearance });
  const isBusy = loading;
  const isOff = disabled;

  const look = themePart(theme, 'button', `variants.${selection.color}.${selection.appearance}`);
  const sizes = themePart(theme, 'button', 'sizes');
  const sized = sizes[size] ?? sizes.md;
  const radius = themePart(theme, 'button', round ? 'shapes.round.radius' : iconOnly ? 'shapes.icon.radius' : 'base.radius');
  const gap = themePart(theme, 'button', 'base.icon_gap');
  // An icon-only button draws its glyph at the shape's size (the glyph of a control that is only a glyph is larger
  // than one beside a label); a button with a label draws it at its size's.
  const glyphSize = iconOnly ? themePart(theme, 'button', 'shapes.icon.icon_size') : sized.icon_size;

  const styles = React.useMemo(() => {
    const textLook = nativeTextStyle(sized.text);
    const fittedLook: Record<string, any> = { ...textLook };
    delete fittedLook.lineHeight;
    const pressed = defined(look.states.pressed);
    const off = defined(look.states.disabled);
    return StyleSheet.create({
      box: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: sized.height,
        ...(iconOnly ? { width: sized.height, height: sized.height } : { paddingHorizontal: sized.padding_x }),
        borderRadius: radius,
        gap,
        ...nativeBoxStyle(look),
      },
      pressed: nativeBoxStyle(pressed),
      disabled: nativeBoxStyle(off),
      text: { ...textLook, color: look.color, textAlign: 'center', flexShrink: 1 },
      // A label that shrinks to fit (`fitText`) is one line, centered by the box. Android also shrinks
      // a fitted text until the font's own height fits its line height, so with the theme's line
      // (1.2) every fitted label fell to the smallest scale (80 %) even with room to spare. Without
      // a line height (and without the font's own padding, which lifted the glyphs) only the width
      // shrinks it; iOS fits by the width alone and keeps the line.
      fitted: { ...(Platform.OS === 'android' ? { ...fittedLook, includeFontPadding: false, textAlignVertical: 'center' as const } : textLook), color: look.color, textAlign: 'center', flexShrink: 1 },
      pressedText: pressed.color ? { color: pressed.color } : {},
      disabledText: off.color ? { color: off.color } : {},
      // The hold's content: the box's own row, drawn again over the fill (the box's border is outside it).
      holdRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...(iconOnly ? {} : { paddingHorizontal: sized.padding_x }),
        gap,
      },
    });
  }, [look, sized, radius, gap, iconOnly]);
  // The hold paints the button's own pressed look as its fill.
  const holdBackground = holdLayer ? defined(look.states.pressed).background : undefined;

  // Anything tappable has a 44 pt touch target: a smaller box grows its touch area, not its look.
  const slop = Math.max(0, Math.ceil((themeControlHeight(theme, 'md') - sized.height) / 2));

  // An `<Icon>` without its own size or color takes the button's: its size's
  // `icon_size` and its ink (pressed and disabled included).
  const glyph = (pressed: boolean) => React.isValidElement(icon) && icon.type === Icon
    ? React.cloneElement(icon as React.ReactElement<any>, {
      size: (icon.props as any).size ?? glyphSize,
      color: (icon.props as any).color ?? ((isOff && styles.disabledText.color) || (pressed && styles.pressedText.color) || styles.text.color),
    })
    : icon;

  const label = typeof text === 'string' || typeof text === 'number'
    ? (pressed: boolean) => (
      <Text
        maxFontSizeMultiplier={TEXT_SCALE_LIMIT}
        {...(fitText && { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: FIT_MIN_SCALE })}
        style={[fitText ? styles.fitted : styles.text, pressed && styles.pressedText, isOff && styles.disabledText]}
      >
        {text}
      </Text>
    )
    : () => text;

  // The box's three pieces, in the order the button draws them; the hold draws them again over its fill.
  const leading = (pressed: boolean) => isBusy
    ? <ActivityIndicator size='small' color={(isOff ? styles.disabledText.color : undefined) ?? styles.text.color} />
    : iconPosition === 'start' && glyph(pressed);
  const labelled = (pressed: boolean) => !iconOnly && text !== undefined && text !== null && text !== '' ? label(pressed) : null;
  const trailing = (pressed: boolean) => !isBusy && iconPosition === 'end' && glyph(pressed);

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isOff, busy: isBusy }}
      // A button that is off but has something to say about it keeps receiving the tap. Its off state is the accessibility state's
      // alone: Pressable's own `disabled` (even `false`) overrides `accessibilityState.disabled`, so it is left unset then.
      disabled={((isOff && !onDisabledPress) || isBusy) || undefined}
      onPress={isOff ? onDisabledPress : onClick}
      onPressIn={holdLayer?.onPressIn}
      onPressOut={holdLayer?.onPressOut}
      ref={holdLayer?.viewRef}
      onTouchEnd={holdLayer && ((event) => holdLayer.onTouchEnd(event, slop))}
      onTouchCancel={holdLayer && ((event) => holdLayer.onTouchEnd(event, slop))}
      hitSlop={slop || undefined}
    >
      {({ pressed }) => holdLayer ? (
        // A held button's press is its fill (drawn again over the box with the pressed look), not the pressed look of the whole box.
        <View style={[styles.box, isOff && styles.disabled, style]}>
          {leading(false)}
          {labelled(false)}
          {trailing(false)}
          {holdLayer.holding && holdBackground && (
            <HoldFill progress={holdLayer.progress} background={holdBackground} radius={radius}>
              <View style={styles.holdRow}>{leading(true)}{labelled(true)}{trailing(true)}</View>
            </HoldFill>
          )}
        </View>
      ) : (
        <View style={[styles.box, pressed && !isOff && styles.pressed, isOff && styles.disabled, style]}>
          {leading(pressed && !isOff)}
          {labelled(pressed && !isOff)}
          {trailing(pressed && !isOff)}
        </View>
      )}
    </Pressable>
  );
};

const OButton = (props: Props): React.ReactElement =>
  props.hold && props.onClick
    ? <HoldToConfirm {...props} Button={ButtonBody} />
    : <ButtonBody {...props} />;

export default OButton;
