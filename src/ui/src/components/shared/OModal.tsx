import * as React from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

import { useUtils } from '@components';
import OIcon from './OIcon';
import OText from './OText';
import Icon from './Icon';
import ONavbar from './ONavbar';
import { ModalCloseButton, closeButtonInset } from './styles';
import { nativeBoxStyle, nativeTextStyle, themeColor, themeGutter, themeImage, themeSpace, themeTitleAlign } from '@/theme/helpers';

/**
 * The app's modal, in its two shapes:
 *
 * - `entireModal`: a full-screen page (`components.modal`'s background) under
 *   the screen's top bar (`components.header`: back and title), with the order's
 *   store, customer and driver pictures at its end unless `hideIcons`;
 *   `customClose` leaves the bar to the content.
 * - otherwise a dialog: the content centered over the theme's scrim, under the
 *   modal's title when it has one. With `box` the content (and the title) sit
 *   inside the modal's box (`components.modal`: background, radius, padding,
 *   shadow), on the page gutter, never wider than the modal's `sm` width nor
 *   taller than the window, and above the keyboard. With `closable` the box
 *   has the modal's close button (`modal.slots.close`) at the end of its title
 *   row, which calls `onClose`.
 */
interface Props {
  open?: boolean;
  title?: string;
  children?: any;
  onClose?: any;
  style?: any;
  isTransparent?: boolean;
  entireModal?: boolean;
  customClose?: boolean;
  titleSectionStyle?: any;
  order?: any;
  hideIcons?: boolean
  /** A dialog drawn in the modal's box. */
  box?: boolean
  /** With `box`: a close button at the end of the title row. */
  closable?: boolean
  testID?: string
}

const modalStyles = (theme: any, top: number, bottom: number) => {
  const modal = theme.native.components.modal.base
  const avatar = theme.native.components.avatar
  const size = avatar.sizes.sm
  const closeIcon = theme.native.components.button.shapes.icon.icon_size
  // The close button's glyph sits on the box's padding, at the top and at the end; its touch box
  // reaches into the padding (never out of the box).
  const closeEdge = Math.max(modal.padding - closeButtonInset(theme), themeSpace(theme, 'none'))
  const titleAlign = themeTitleAlign(theme)
  // The title's room for the close button: at its end, or on both sides of a centered title.
  const closeRoom = closeIcon + themeSpace(theme, 'sm')
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: modal.background },
    bar: { paddingTop: top },
    scrim: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColor(theme, 'overlay'),
    },
    titleSection: {
      width: '100%',
      paddingTop: top,
      paddingHorizontal: themeGutter(theme),
      paddingBottom: themeSpace(theme, 'md'),
    },
    title: { ...nativeTextStyle(modal.title), color: themeColor(theme, 'on_overlay'), textAlign: themeTitleAlign(theme) },
    // The dialog's room: the window less the system insets and the page gutter on every side. A plain
    // view: the keyboard-avoiding view inside it sets its own `paddingBottom` (the keyboard's), which
    // would replace the room's inset and gutter if both were one view.
    boxRoom: {
      flex: 1,
      width: '100%',
      paddingTop: top + themeGutter(theme),
      paddingBottom: bottom + themeGutter(theme),
      paddingHorizontal: themeGutter(theme),
    },
    // Rides above the keyboard, the box centered in what is left.
    boxAvoid: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // As wide as its room up to the modal's `sm` width (centered in a wider window), never taller than its room.
    box: {
      width: '100%',
      maxWidth: theme.native.components.modal.sizes.sm.width,
      maxHeight: '100%',
      borderRadius: modal.radius,
      padding: modal.padding,
      gap: modal.gap,
      ...nativeBoxStyle({ background: modal.background, shadow: modal.shadow }),
    },
    boxTitle: { ...nativeTextStyle(modal.title), color: themeColor(theme, 'text'), textAlign: titleAlign },
    // The title row of a closable box: at least as tall as the close glyph beside it.
    boxHeader: { minHeight: closeIcon, justifyContent: 'center' },
    boxTitleClosable: titleAlign === 'center' ? { paddingHorizontal: closeRoom } : { paddingEnd: closeRoom },
    boxClose: { position: 'absolute', top: closeEdge, end: closeEdge },
    pictures: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    picture: {
      width: size.size,
      height: size.size,
      borderRadius: avatar.base.radius,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...nativeBoxStyle({ background: avatar.base.background, border: avatar.base.border }),
    },
    image: { width: size.size, height: size.size },
  })
}

/**
 * What the modal draws, inside its own `SafeAreaProvider`. A modal is a window of its own: on
 * Android the activity pads the app's screens, so the insets outside the modal are 0 while the
 * modal's window runs under the status bar (edge to edge, API 35+). Only the provider inside the
 * modal measures that window, so the insets are read here and never in `OModal`.
 */
const OModalBody = (props: Props): React.ReactElement => {
  const {
    title,
    children,
    onClose,
    entireModal,
    customClose,
    titleSectionStyle,
    order,
    hideIcons,
    box,
    closable = false,
    testID
  } = props;

  const theme: any = useTheme();
  const [{ optimizeImage }] = useUtils();
  const { top, bottom } = useSafeAreaInsets();
  const styles = React.useMemo(() => modalStyles(theme, top, bottom), [theme, top, bottom]);
  const avatar = theme.native.components.avatar

  /** A picture of the order's header, or a person glyph when there is none. */
  const picture = (url?: string, fallback?: any) => {
    const source = url ? { uri: optimizeImage(url, 'h_300,c_limit') } : fallback
    return (
      <View style={styles.picture}>
        {source
          ? <OIcon src={source} cover style={styles.image} />
          : <Icon name='person' size={avatar.sizes.sm.icon_size} color={avatar.base.color} />}
      </View>
    )
  }

  return !entireModal ? (
    <View style={styles.scrim}>
      {box && (
        // The box rides above the keyboard (a field inside it stays in sight).
        <View style={styles.boxRoom}>
          <KeyboardAvoidingView style={styles.boxAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.box} testID={testID}>
              {closable ? (
                <View style={styles.boxHeader}>
                  {!!title && <OText style={[styles.boxTitle, styles.boxTitleClosable]}>{title}</OText>}
                </View>
              ) : !!title && <OText style={styles.boxTitle}>{title}</OText>}
              {closable && (
                <View style={styles.boxClose}>
                  <ModalCloseButton onPress={() => onClose && onClose()} testID={testID ? `${testID}-close` : undefined} />
                </View>
              )}
              {children}
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
      {!box && !!title && (
        <View style={titleSectionStyle ?? styles.titleSection}>
          <OText style={styles.title} adjustsFontSizeToFit numberOfLines={1}>
            {title}
          </OText>
        </View>
      )}
      {!box && children}
    </View>
  ) : (
    <View style={styles.page}>
      {!customClose && (
        <View style={styles.bar}>
          <ONavbar
            title={title}
            onBack={() => onClose && onClose()}
            right={!hideIcons ? (
              <View style={styles.pictures}>
                {picture(order?.business?.logo, themeImage(theme, 'placeholder.business_logo'))}
                {picture(order?.customer?.photo, themeImage(theme, 'placeholder.customer'))}
                {!!order?.driver && picture(order?.driver?.photo, themeImage(theme, 'placeholder.customer'))}
              </View>
            ) : undefined}
          />
        </View>
      )}
      {children}
    </View>
  );
};

const OModal = (props: Props): React.ReactElement => {
  const { open, onClose, isTransparent, entireModal } = props;
  return (
    <Modal
      // A page slides in; a dialog fades in over its scrim.
      animationType={entireModal ? 'slide' : 'fade'}
      transparent={isTransparent}
      visible={open}
      onRequestClose={() => {
        onClose && onClose();
      }}>
      {/* A modal covers the tab bar: a bottom bar inside it is not "inside the tabs" (useFloatingButtonInset). */}
      <BottomTabBarHeightContext.Provider value={undefined}>
        <SafeAreaProvider>
          <OModalBody {...props} />
        </SafeAreaProvider>
      </BottomTabBarHeightContext.Provider>
    </Modal>
  );
};

export default OModal;
