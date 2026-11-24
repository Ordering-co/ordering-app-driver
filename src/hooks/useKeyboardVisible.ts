import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, KeyboardEvent, KeyboardMetrics, Platform } from 'react-native';

/**
 * The tallest system bar a docked keyboard's frame can stop above (dp): React Native reports the frame as ending where
 * the bottom bar begins, not at the display's edge (`height` is the keyboard's inset minus the bars' inset, see
 * `ReactRootView`), so `screenY + height` is the display's height minus the bar: 24 dp with gesture navigation, 48 dp
 * with the three buttons (every phone, whatever its density) and 56 dp on a tablet's taskbar.
 */
const SYSTEM_BAR_MAX = 56;

/**
 * How far above the display's bottom a docked keyboard's frame may end (dp): the tallest bar and some slack. It once
 * was 48, the three-button bar's own height, so a docked keyboard's frame ended exactly on the limit and `>=` was
 * decided by the rounding of the float it arrives as (866.28569 against 866.28571): a keyboard with its suggestion
 * strip off, or the numbers pad, read as floating, the avoiding views were turned off and the pinned bar stayed under
 * the keyboard. A floating keyboard is told apart by its height (0 when it takes no room) or by a frame that hovers
 * well above the bottom, never by a hair.
 */
const DOCKED_TOLERANCE = SYSTEM_BAR_MAX + 16;

/**
 * Whether a keyboard frame takes room from the screen at the bottom. On Android a floating (undocked) keyboard is
 * reported as shown with an end height of 0 (or a frame that hovers over the content and does not reach the bottom
 * of the display, once the system bar it stops above is allowed for: `DOCKED_TOLERANCE`): it covers nothing, so a sheet, a pinned bar or an avoiding view must keep its resting place and
 * not lift for it. iOS keeps its own rule: every show event counts (its floating iPad keyboard is out of scope).
 * This is the one rule of the app: every reader of the keyboard (this hook, `KeyboardScreen`, `OBottomPopup`, the
 * pinned bar, the field reveal) asks it.
 */
export const keyboardTakesRoom = (frame?: Partial<KeyboardMetrics> | null) => {
  if (Platform.OS === 'ios') return true;
  const height = frame?.height ?? 0;
  if (height <= 0) return false;
  // A frame with no position (a docked keyboard that reports only its height) is taken as docked.
  if (typeof frame?.screenY !== 'number') return true;
  return frame.screenY + height >= Dimensions.get('screen').height - DOCKED_TOLERANCE;
};

/** Runs `read` on the keyboard's frame now and on every show / hide event; a hidden keyboard reads `hidden`. */
const useKeyboardReading = (read: (frame?: Partial<KeyboardMetrics> | null) => boolean, hidden = false) => {
  const [value, setValue] = useState(() => Keyboard.isVisible() ? read(Keyboard.metrics()) : hidden);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    // Each show event says what the keyboard is now: a docked one after a floating one is up, and the other way round.
    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) =>
      setValue(read(event?.endCoordinates)),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setValue(hidden),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
    // `read` and `hidden` are module-level rules, not state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
};

const takes = (frame?: Partial<KeyboardMetrics> | null) => keyboardTakesRoom(frame);
const floats = (frame?: Partial<KeyboardMetrics> | null) => !keyboardTakesRoom(frame);

/** Whether the keyboard is up and takes room from the screen. */
export const useKeyboardVisible = () => useKeyboardReading(takes);

/**
 * Whether a keyboard is showing that takes no room (a floating Gboard): what an avoiding view must be told so it adds
 * no padding for it. False with no keyboard and with a docked one, so a docked keyboard behaves as it always has.
 */
export const useKeyboardFloating = () => useKeyboardReading(floats);
