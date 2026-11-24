import React from 'react'
import { Modal, TouchableWithoutFeedback, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'

import { ModalCloseButton, closeButtonInset } from './styles'
import { useTheme } from 'styled-components/native';
import { useKeyboardFloating, useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { barBottomSpace, nativeShadowStyle, nativeTextStyle, themeColor, themeSpace, themeTitleAlign } from '@/theme/helpers'
import OText from './OText'

interface Props {
  open: boolean;
  transparent?: boolean;
  title?: string;
  children?: any;
  onClose?: any;
  bottomContainerStyle?: any;
  /** @deprecated use `bottomContainerStyle`. */
  containerStyle?: any;
  titleStyle?: any;
  closeIcon?: boolean;
  presentationStyle?: "fullScreen" | "pageSheet" | "formSheet" | "overFullScreen" | undefined;
  /**
   * The small handle drawn at the top of the sheet (`components.sheet.base.handle_color`), as in the mockups of
   * every sheet. It is decoration: the sheet is not dragged, it is closed by its close icon, the dimmed page or
   * the system's back. On by default; `false` leaves it out.
   */
  showHandleBar?: boolean;
  animationType?: "slide" | "fade" | "none";
  childenOutsideContainer?: boolean; //
  /**
   * The sheet owns the padding of its body: the sheet's padding
   * (`components.sheet.base.padding`) at the sides and under it, over the
   * system space the sheet keeps at the bottom. The caller then adds none.
   * Off for a body that goes from edge to edge (a list of rows, as the select's).
   */
  padded?: boolean;
  /**
   * The sheet holds a field: it rides above the keyboard on both platforms
   * (the room the keyboard covers is measured, so a window the system already
   * resized is not pushed twice). With the keyboard up the sheet's last control stands where a pinned bar's
   * does (`components.bottom_bar.base.padding` over the keyboard, no system space under it: the keyboard covers
   * it), so the gap over the keyboard is the same on every screen and sheet.
   */
  keyboardAware?: boolean;
  /**
   * A tap on the dimmed page. By default it is `onClose`; a sheet that holds a field being typed in gives it to end the
   * typing first (a tap that only ends the typing leaves the sheet open, the next one closes it).
   */
  onBackdropPress?: () => void;
  /**
   * A tap on a part of the sheet that no control answers (the title row, a label, the padding). Giving it makes those parts
   * claim the touch (nothing else changes: a button, a field or a link under the finger still gets its tap first, being
   * deeper, and nothing becomes focusable for a screen reader). For a sheet with a field being typed in, which a tap
   * elsewhere ends. Not for a sheet that scrolls.
   */
  onBlankPress?: () => void;
  testID?: string;
}
/**
 * What the sheet draws, inside its own `SafeAreaProvider`. A sheet is a modal, a window of its own: on Android the
 * activity pads the app's screens, so the insets outside it read 0 while its window runs under the navigation
 * area (edge to edge). Only the provider inside the modal measures that window, so the inset is read here (as
 * `OModal` does) and the sheet's last control clears the navigation area as a pinned bar does.
 */
const OBottomPopupBody = (props: Props) => {
  const {
    title,
    onClose,
    children,
    titleStyle,
    bottomContainerStyle,
    containerStyle,
    closeIcon,
    showHandleBar = true,
    childenOutsideContainer,
    padded = false,
    keyboardAware = false,
    onBackdropPress,
    onBlankPress,
    testID
  } = props

  const insets = useSafeAreaInsets()
  const theme: any = useTheme();

  // Only a sheet that holds a field changes with the keyboard: the others never read it.
  const keyboardVisible = useKeyboardVisible()
  // A floating keyboard takes no room: the sheet does not ride above it (its padding left a strip of scrim under the sheet, as tall as the navigation area).
  const keyboardFloating = useKeyboardFloating()
  const keyboardUp = keyboardAware && keyboardVisible
  const styles = React.useMemo(() => sheetStyles(theme, keyboardUp), [theme, keyboardUp])
  const bottomSpace = keyboardUp ? 0 : barBottomSpace(theme, insets.bottom)

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior='padding' enabled={keyboardAware && !keyboardFloating} testID={testID}>
        <TouchableWithoutFeedback
          style={styles.touchableOutsideStyle}
          onPress={() => (onBackdropPress ?? onClose)?.()}
        >
          <View style={styles.touchableOutsideStyle} />
        </TouchableWithoutFeedback>
        <View style={{ ...styles.bottomContainer, ...containerStyle, ...bottomContainerStyle }}>
          <View
            style={{ paddingBottom: bottomSpace }}
            testID='sheet-bottom-space'
            // A control, a field or a link under the finger is deeper and takes the touch first: only a blank part gets here.
            onStartShouldSetResponder={onBlankPress ? () => true : undefined}
            onResponderRelease={onBlankPress ? () => onBlankPress() : undefined}
          >
            {showHandleBar && (
              <View style={styles.handleRow} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
                <View style={styles.handle} testID='sheet-handle' />
              </View>
            )}
            <View style={[styles.modalTitleStyle, showHandleBar && styles.underHandle, !title && !closeIcon && styles.noTitle]}>
              {!!title && (
                <OText style={[styles.titleStyle, titleStyle]}>
                  {title}
                </OText>
              )}
              {closeIcon && (
                <View style={styles.close}>
                  <ModalCloseButton onPress={onClose} />
                </View>
              )}
            </View>
            {!childenOutsideContainer && (padded ? <View style={styles.body} testID='sheet-body'>{children}</View> : children)}
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Only a caller that draws outside the sheet gets this one: with nothing in it, its own keyboard
          padding still took room at the bottom of the modal, a transparent strip (the page, undimmed)
          between the sheet and the keyboard. */}
      {childenOutsideContainer && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          enabled={!keyboardFloating}
          keyboardVerticalOffset={themeSpace(theme, 'xl')}
        >
          {children}
        </KeyboardAvoidingView>
      )}
    </>
  )
}

const OBottomPopup = (props: Props) => {
  const { open, transparent, onClose, presentationStyle, animationType } = props
  return (
    <Modal
      animationType={animationType || 'fade'}
      transparent={transparent ?? true}
      visible={open}
      onRequestClose={() => onClose?.()}
      presentationStyle={presentationStyle || 'overFullScreen'}
    >
      <SafeAreaProvider>
        <OBottomPopupBody {...props} />
      </SafeAreaProvider>
    </Modal>
  )
}

// Styles from `components.sheet`, built with the theme (never at module level).
const sheetStyles = (theme: any, keyboardUp: boolean) => {
  const sheet = theme.native.components.sheet.base
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColor(theme, 'overlay'),
      justifyContent: 'flex-end'
    },
    touchableOutsideStyle: {
      flex: 1,
      width: '100%'
    },
    bottomContainer: {
      borderTopLeftRadius: sheet.radius,
      borderTopRightRadius: sheet.radius,
      backgroundColor: sheet.background,
      width: '100%',
      ...nativeShadowStyle(sheet.shadow)
    },
    titleStyle: {
      ...nativeTextStyle(sheet.title),
      color: sheet.title_color,
      textAlign: themeTitleAlign(theme),
      flex: 1
    },
    // The title row: `sheet.padding` at the sides and over it; the body starts `md` under it, as every board draws it.
    modalTitleStyle: {
      position: 'relative',
      padding: sheet.padding,
      paddingBottom: themeSpace(theme, 'md'),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    noTitle: { paddingBottom: 0 },
    // The close button's glyph, not its touch box, sits at the sheet's side padding.
    close: { marginRight: -closeButtonInset(theme) },
    // With the keyboard up the body ends where a pinned bar does (its own padding over the keyboard), not at the
    // sheet's larger padding.
    body: {
      paddingHorizontal: sheet.padding,
      paddingBottom: keyboardUp ? theme.native.components.bottom_bar.base.padding : sheet.padding
    },
    // The handle: `sm` from the sheet's top edge, centered; the title row under it starts `md` below it.
    handleRow: { paddingTop: themeSpace(theme, 'sm'), alignItems: 'center' },
    underHandle: { paddingTop: themeSpace(theme, 'md') },
    handle: {
      backgroundColor: sheet.handle_color,
      height: sheet.handle_height,
      width: themeSpace(theme, 'xxl'),
      borderRadius: theme.native.tokens.radius.full
    }
  })
}

export default OBottomPopup
