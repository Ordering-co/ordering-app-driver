import * as React from 'react';
import { ImageSourcePropType, ImageStyle, ViewStyle, TextInputProps, TextStyle, StyleSheet, Pressable, TextInput, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeBoxStyle, nativeTextStyle, reservedBorder, themeScoped } from '@/theme/helpers';
import OIcon from './OIcon';
import Icon from './Icon';
import OText from './OText';
import { inputTint, singleLineInput, textAreaInput } from './singleLineInput';

/**
 * The app's text field: `components.input` of the theme (size `md`; the focus,
 * error and disabled states). The form that holds it spaces its fields
 * (`field.gap`). `hasError` paints the error state.
 */
interface Props extends TextInputProps {
  isRequired?: boolean;
  requiredMsg?: string;
  isDisabled?: boolean;
  isSecured?: boolean;
  style?: ViewStyle;
  placeholder?: string;
  icon?: ImageSourcePropType | string;
  iconRight?: ImageSourcePropType;
  iconColor?: string;
  iconRightColor?: string;
  iconStyle?: ImageStyle;
  iconRightStyle?: ImageStyle;
  iconCustomRight?: any;
  value?: string;
  onChange?: any;
  name?: string;
  type?: string;
  multiline?: boolean;
  vertorIcon?: string;
  vectorIconColor?: string;
  forwardRef?: any;
  inputStyle?: TextStyle;
  wrapperRef?: any;
  onPress?: any;
  isFocusHighlight?: boolean
  autoCompleteType?: string,
  isValueSync?: boolean,
  isLazyLoad?: boolean,
  customIcon?: any
  hasError?: boolean
  /** The group the field is in (`account_page`, `auth_form`): its `scope` of `input` and `field`, when it has one, is the look. */
  scope?: string
  /** The ink of the label above the box (`field.label_position: above`), for a field over a photo; the field's own by default. */
  labelColor?: string
}

/** A box look whose border is only the bottom one when the theme says so (`input.border_sides`). */
const onSides = (style: Record<string, any>, sides: 'all' | 'bottom') => {
  if (sides !== 'bottom' || style.borderWidth === undefined) return style
  const { borderWidth, borderColor, borderStyle, ...rest } = style
  return { ...rest, borderWidth: 0, borderBottomWidth: borderWidth, ...(borderColor && { borderBottomColor: borderColor }), ...(borderStyle && { borderStyle }) }
}

const inputStyles = (theme: any, scope?: string) => {
  const input = scope ? themeScoped(theme, scope, 'input') : theme.native.components.input
  const base = input.base
  const field = (scope ? themeScoped(theme, scope, 'field') : theme.native.components.field).base
  const states = input.variants.default.states
  // Every state keeps the room of the widest border (see-through where it has
  // none), so an error or a focus changes the color and never moves the text.
  const ring = reservedBorder([base, states.focus, states.error, states.disabled])
  const box = (look: Record<string, any>) => onSides({ ...nativeBoxStyle(look), ...ring(look, base) }, base.border_sides)
  return StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      minHeight: input.sizes.md.height,
      borderRadius: base.radius,
      paddingHorizontal: base.padding_x,
      gap: base.icon_gap,
      ...box(base),
    },
    focus: box(states.focus),
    error: box(states.error),
    disabled: box(states.disabled),
    // `field.label_position: above`: the placeholder becomes a label over the box.
    field: { width: '100%' },
    label: { ...nativeTextStyle(field.label), color: field.label_color, marginBottom: field.label_gap },
    input: {
      flex: 1,
      alignSelf: 'stretch',
      ...nativeTextStyle(base.text),
      color: base.text_color,
    },
    icon: {
      width: base.icon_size,
      height: base.icon_size,
    },
  })
}

const OInput = ({ iconColor, ...props }: Props): React.ReactElement => {
  const theme: any = useTheme();
  const styles = React.useMemo(() => inputStyles(theme, props.scope), [theme, props.scope]);
  const base = (props.scope ? themeScoped(theme, props.scope, 'input') : theme.native.components.input).base;
  const field = (props.scope ? themeScoped(theme, props.scope, 'field') : theme.native.components.field).base;
  const [inputFocused, setInputFocused] = React.useState(false)

  const onFocus = (e: any) => {
    props.onFocus && props.onFocus(e)
    setInputFocused(true)
  }

  const onBlur = (e: any) => {
    props.onBlur && props.onBlur(e)
    setInputFocused(false)
  }

  let timeout: null | any = null
  const onChange = (e: any) => {
    if (!props.isLazyLoad) {
      props.onChange(e)
    } else {
      clearTimeout(timeout)
      timeout = setTimeout(function () {
        props.onChange(e)
      }, 750)
    }
  }

  const labelAbove = field.label_position === 'above' && !!props.placeholder
  const box = (
    <Pressable
      style={[
        styles.wrapper,
        inputFocused && styles.focus,
        props.hasError && styles.error,
        props.isDisabled && styles.disabled,
        props.style,
      ]}
      onPress={() => {
        props.forwardRef?.current?.focus?.();
        props.onPress && props.onPress()
      }}
    >
      {props.icon ? (
        <OIcon
          src={props.icon}
          color={iconColor === 'none' ? undefined : iconColor ?? base.icon_color}
          width={base.icon_size}
          height={base.icon_size}
          style={props.iconStyle}
        />
      ) : null}
      {props.customIcon && <props.customIcon />}
      {props.vertorIcon && (
        <Icon set='mci' name={props.vertorIcon} size={base.icon_size} color={props.vectorIconColor ?? base.icon_color} />
      )}
      <TextInput
        testID={props.testID}
        autoFocus={props?.autoFocus}
        secureTextEntry={props.isSecured}
        onChangeText={(txt: any) => props.name ? onChange({ target: { name: props.name, value: txt } }) : onChange(txt)}
        defaultValue={props.value}
        placeholder={props.placeholder && !labelAbove ? props.placeholder : ''}
        // The label above the box names the field for a screen reader too.
        accessibilityLabel={labelAbove ? props.placeholder : props.accessibilityLabel}
        keyboardType={(props.type || 'default') as any}
        multiline={props.multiline}
        scrollEnabled={props.multiline}
        editable={!props.isDisabled}
        autoCapitalize={props.autoCapitalize}
        autoComplete={props.autoCompleteType as any}
        autoCorrect={props.autoCorrect}
        returnKeyType={props.returnKeyType}
        onSubmitEditing={props.onSubmitEditing}
        clearButtonMode={props.clearButtonMode ?? 'never'}
        blurOnSubmit={props.blurOnSubmit}
        maxLength={props.maxLength}
        {...inputTint(theme)}
        {...(props.selectionColor && { selectionColor: props.selectionColor })}
        maxFontSizeMultiplier={1.3}
        placeholderTextColor={base.placeholder}
        ref={(e: any) => {
          props.forwardRef && (typeof props.forwardRef === 'function' ? props.forwardRef(e) : props.forwardRef.current = e)
        }}
        // A text area starts at its top on both platforms; a one-line field is centered (Android starts it at the top).
        textAlignVertical={props.multiline ? 'top' : 'center'}
        style={[styles.input, props.multiline ? textAreaInput : singleLineInput, props.inputStyle]}
        onFocus={onFocus}
        onBlur={onBlur}
        value={props.isValueSync ? props.value : undefined}
      />
      {props.iconRight && (
        <OIcon
          src={props.iconRight}
          color={props.iconRightColor}
          width={base.icon_size}
          height={base.icon_size}
          style={props.iconRightStyle}
        />
      )}
      {props.iconCustomRight}
    </Pressable>
  );

  return labelAbove ? (
    <View style={styles.field}>
      <OText style={[styles.label, props.labelColor ? { color: props.labelColor } : null]}>{props.placeholder}</OText>
      {box}
    </View>
  ) : box;
};

export default OInput;
