import React, { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { FloatingButtonParams } from '../../types';
import { useFloatingButtonInset } from '../../hooks/useFloatingButtonInset';
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';
import { nativeBoxStyle, themeGutter, themeOpacity, themeSpace } from '@/theme/helpers';

import { FloatingButton as FloatingButtonController } from '@components';
import { OButton } from '../shared';
import { useReportBottomBar } from '../../../../context/BottomBarContext';

/**
 * The bar of actions pinned to the bottom of a screen: `components.bottom_bar`
 * of the theme. One action is the bar's `button` slot; two are its `accept`
 * slot over its `reject` one (decision D3: accept is success, reject is danger),
 * the reject one hidden when the server turns rejecting off. A `step` is an
 * action of the screen that comes before those two (arrived to the business,
 * before the pickup is complete or failed): it is drawn over them, in the `button` slot.
 * A `third` is another negative action (order not ready): it is drawn between
 * the two, in the `reject` slot. Top to bottom: step, accept, third, reject.
 *
 * A single action wears the `slot` the screen names (`accept` for a positive one).
 * `blocked` is an action that still answers a tap, to say why it cannot go on: it
 * paints at the theme's disabled opacity and is not disabled. `loading` is the
 * button's spinner. `outline` draws the first action in the `outline` appearance of the button
 * (the slot's color and size stay): the milder action of two negative ones, or one the driver
 * need not take. `buttonLook` is the look of another component's slot for the first action (the
 * auth forms' submit and cancel), over the bar's own slot. `inline` keeps the bar in the screen's flow (a screen whose
 * keyboard lifts it) instead of pinned to the bottom. While it is on screen it tells the
 * toast its height, so the toast is drawn above the bar.
 *
 * `firstButtonHold`, `secondButtonHold`, `stepButtonHold` and `thirdButtonHold` make a button fire on a
 * press and hold (`OButton`'s `hold`: its fill shows the progress, a tap only says "Hold to confirm",
 * a screen reader gets a confirmation dialog): for a step the driver cannot take back that would
 * otherwise fire on one tap. A bar without them is exactly what it was.
 *
 * `onDisabledPress` is what a tap on a `disabled` button does (`OButton`'s `onDisabledPress`): the buttons stay painted
 * off, and still say why when they are touched (the app is offline and does not save changes for later).
 */
const barStyles = (theme: any, bottom: number, padded: boolean, inline: boolean) => {
  const bar = theme.native.components.bottom_bar.base
  return StyleSheet.create({
    bar: {
      ...(!inline && { position: 'absolute', bottom: 0, left: 0, zIndex: 1000 }),
      width: '100%',
      paddingTop: bar.padding,
      paddingBottom: bar.padding + bottom,
      paddingHorizontal: padded ? themeGutter(theme) : 0,
      gap: themeSpace(theme, 'sm'),
      backgroundColor: bar.background,
      ...(bar.border_top && {
        borderTopWidth: bar.border_top.borderWidth,
        borderTopColor: bar.border_top.borderColor,
      }),
      ...nativeBoxStyle({ background: bar.background, shadow: bar.shadow }),
    },
    blocked: { opacity: themeOpacity(theme, 'disabled') },
  })
}

const FloatingButtonUI = (props: FloatingButtonParams) => {
  const {
    btnText,
    secondBtnText,
    secondButtonClick,
    firstButtonClick,
    stepBtnText,
    stepButtonClick,
    thirdBtnText,
    thirdButtonClick,
    stepButtonHold,
    secondButtonHold,
    thirdButtonHold,
    firstButtonHold,
    onDisabledPress,
    disabled,
    secondButton,
    isPadding,
    isHideRejectButtons,
    negative,
    slot,
    blocked,
    loading,
    outline,
    buttonLook,
    inline,
    testID,
    buttonTestID
  } = props;

  const theme: any = useTheme();
  // The keyboard covers the home indicator / navigation area: with it up the bar keeps only its own padding,
  // so the gap over the keyboard is the same on every screen; with it down the bar clears the inset again.
  const keyboardUp = useKeyboardVisible();
  const inset = useFloatingButtonInset();
  const bottom = keyboardUp ? 0 : inset;
  const styles = React.useMemo(() => barStyles(theme, bottom, !!isPadding, !!inline), [theme, bottom, isPadding, inline]);
  // The toast rides above this bar (it is drawn at the root, over every screen).
  const [height, setHeight] = useState(0);
  useReportBottomBar(useId(), height);
  const slots = theme.native.components.bottom_bar.slots
  // Beside a second button the first one is the negative action; alone it is the
  // screen's action unless the caller says it is a negative one too.
  const first = slots[slot ?? (secondButton || negative ? 'reject' : 'button')]
  const second = slots.accept

  return (
    <View style={styles.bar} testID={testID} onLayout={(event) => setHeight(Math.round(event.nativeEvent.layout.height))}>
      {!!stepBtnText && (
        <OButton
          text={stepBtnText}
          color={slots.button.color}
          appearance={slots.button.appearance}
          size={slots.button.size}
          onClick={stepButtonClick}
          hold={stepButtonHold}
          disabled={disabled}
          onDisabledPress={onDisabledPress}
          fitText
        />
      )}
      {secondButton && (
        <OButton
          text={secondBtnText}
          color={second.color}
          appearance={second.appearance}
          size={second.size}
          onClick={secondButtonClick}
          hold={secondButtonHold}
          disabled={disabled}
          onDisabledPress={onDisabledPress}
          fitText
        />
      )}
      {!!thirdBtnText && (
        <OButton
          text={thirdBtnText}
          color={slots.reject.color}
          appearance={slots.reject.appearance}
          size={slots.reject.size}
          onClick={thirdButtonClick}
          hold={thirdButtonHold}
          disabled={disabled}
          onDisabledPress={onDisabledPress}
          fitText
        />
      )}
      {!isHideRejectButtons && (
        <View style={blocked ? styles.blocked : undefined}>
          <OButton
            testID={buttonTestID}
            text={btnText}
            color={buttonLook?.color ?? first.color}
            appearance={buttonLook?.appearance ?? (outline ? 'outline' : first.appearance)}
            size={buttonLook?.size ?? first.size}
            onClick={firstButtonClick}
            hold={firstButtonHold}
            disabled={disabled}
            onDisabledPress={onDisabledPress}
            loading={loading}
            fitText
          />
        </View>
      )}
    </View>
  );
};

export const FloatingButton = (props: FloatingButtonParams) => {
  const floatingButtonProps = {
    ...props,
    UIComponent: FloatingButtonUI,
  };

  return <FloatingButtonController {...floatingButtonProps} />;
};
