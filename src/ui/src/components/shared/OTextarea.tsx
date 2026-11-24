import * as React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeBoxStyle, nativeTextStyle, reservedBorder } from '@/theme/helpers';
import { inputTint, textAreaInput } from './singleLineInput'

/**
 * A text area: the theme's input (`components.input`) as tall as `lines` of
 * its text (four by default), with the focus state.
 */
interface Props {
  lines?: number;
  value?: string;
  placeholder?: string;
  onChange?: any;
  onFocus?: any;
  textTareaRef?: any;
  autoFocus?: boolean;
  testID?: string;
}

const DEFAULT_LINES = 4

const OTextarea = (props: Props) => {
  const theme: any = useTheme();
  const [focused, setFocused] = React.useState(false)
  const input = theme.native.components.input
  const styles = React.useMemo(() => {
    const text = nativeTextStyle(input.base.text)
    // The same border room as a one-line field in every state: a text area's text starts where a field's does.
    const states = input.variants.default.states
    const ring = reservedBorder([input.base, states.focus, states.error, states.disabled])
    return StyleSheet.create({
      box: {
        borderRadius: input.base.radius,
        paddingHorizontal: input.base.padding_x,
        paddingVertical: input.base.icon_gap,
        ...nativeBoxStyle(input.base),
        ...ring(input.base),
      },
      focus: { ...nativeBoxStyle(states.focus), ...ring(states.focus, input.base) },
      text: { ...textAreaInput, ...text, color: input.base.text_color, minHeight: (props.lines ?? DEFAULT_LINES) * text.lineHeight },
    })
  }, [input, props.lines]);
  return (
    <View style={[styles.box, focused && styles.focus]}>
      <TextInput
        testID={props.testID}
        ref={props.textTareaRef}
        onFocus={() => { setFocused(true); props.onFocus && props.onFocus() }}
        onBlur={() => setFocused(false)}
        onChangeText={(txt: any) => props.onChange(txt)}
        placeholder={props.placeholder}
        placeholderTextColor={input.base.placeholder}
        {...inputTint(theme)}
        numberOfLines={props.lines}
        value={props.value}
        multiline={true}
        textAlignVertical='top'
        maxFontSizeMultiplier={1.3}
        autoFocus={props.autoFocus}
        style={styles.text}
      />
    </View>
  );
};

export default OTextarea;
