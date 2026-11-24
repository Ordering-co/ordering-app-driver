import * as React from "react";
import { Animated, Keyboard, Platform, StyleSheet, Text, View } from "react-native";
import { nativeShadowStyle, nativeTextStyle, themeGutter, themeMotion } from "@/theme/helpers";
import { ToastType, useLanguage, useToast } from '@components';
import { apiErrorText, getTraduction, messageText } from '../../utils';
import { useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT_SCALE_LIMIT } from './OText';
import { useBottomBarHeight } from '../../../../context/BottomBarContext';

const VARIANTS: Record<string, string> = {
	[ToastType.Info]: 'info',
	[ToastType.Error]: 'error',
	[ToastType.Success]: 'success',
};

export const Toast: React.FC = () => {
	const theme: any = useTheme();
	const toast = theme.native.components.toast;
	const motion = React.useMemo(() => themeMotion(theme, 'base'), [theme]);
	// The toast's own speed; none when it is not animated or the theme turns motion off.
	const duration = toast.base.animated && motion.duration ? toast.base.speed : 0;
	const styles = React.useMemo(() => toastStyles(toast, themeGutter(theme)), [toast, theme]);
	const insets = useSafeAreaInsets();
	// A bar pinned to the bottom (the tabs, a screen's actions) is under the toast's room: above it, its inset included.
	const barHeight = useBottomBarHeight();
	// iOS draws its keyboard over the app: a toast at the bottom would be under it, so it rides above it.
	const [keyboardHeight, setKeyboardHeight] = React.useState(0);
	React.useEffect(() => {
		if (Platform.OS !== 'ios') return;
		const shown = Keyboard.addListener('keyboardWillShow', (event) => setKeyboardHeight(event.endCoordinates.height));
		const hidden = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
		return () => { shown.remove(); hidden.remove(); };
	}, []);
	const [toastConfig, { hideToast }] = useToast();
	const [, t] = useLanguage();
	const opacity = React.useRef(new Animated.Value(0)).current;
	// The provider hands a new `hideToast` on every render of its own parent: the toast's timer is a toast's, not a
	// render's, so it reads the latest one instead of restarting when it changes.
	const hide = React.useRef(hideToast);
	hide.current = hideToast;
	// The animation in flight, stopped when the toast ends or another takes over.
	const running = React.useRef<Animated.CompositeAnimation | null>(null);

	const fadeIn = React.useCallback(() => {
		running.current?.stop();
		running.current = Animated.timing(opacity, {
			toValue: 1,
			duration,
			easing: motion.easing,
			useNativeDriver: true,
		});
		running.current.start();
	}, [opacity, duration, motion.easing]);

	const fadeOut = React.useCallback(() => {
		running.current?.stop();
		const animation = Animated.timing(opacity, {
			toValue: 0,
			duration,
			easing: motion.easing,
			useNativeDriver: true,
		});
		running.current = animation;
		// Only a fade that ran to its end hides the toast: one interrupted by the next toast (it starts while this fades)
		// reports `finished: false`, and hiding then would take the new toast away at once.
		animation.start(({ finished }) => {
			if (finished) hide.current?.();
		});
	}, [opacity, duration, motion.easing]);

	React.useEffect(() => {
		if (!toastConfig) {
			return;
		}

		fadeIn();
		const timer = setTimeout(fadeOut, toastConfig.duration);

		return () => {
			clearTimeout(timer);
			running.current?.stop();
		};
	}, [toastConfig, fadeIn, fadeOut]);

	if (!toastConfig) {
		return null;
	}

	const { type, message } = toastConfig;
	// A toast never shows without a message. An error says what the API said, worded as every API message
	// (a list, `{ message }` or a code), and the generic failure when it said nothing; the other kinds
	// have a text of the app's own, and with none there is nothing to show.
	const text = type === ToastType.Error ? apiErrorText(message, t) : getTraduction(messageText(message), t);
	if (!text) {
		return null;
	}

	const variant = toast.variants[VARIANTS[type]] ?? toast.variants.info;

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.container,
				{ bottom: Math.max(barHeight || insets.bottom, keyboardHeight) + toast.base.offset, opacity },
			]}
		>
			<View style={[styles.toast, { backgroundColor: variant.background }]}>
				<Text maxFontSizeMultiplier={TEXT_SCALE_LIMIT} style={[styles.message, { color: variant.color }]}>{text}</Text>
			</View>
		</Animated.View>
	);
};

const toastStyles = (toast: any, gutter: number) => StyleSheet.create({
	// Centered between the page gutters: a long message never reaches the screen's edges
	// on a phone narrower than the toast's `max_width`. It takes no touch (what is under it does).
	container: {
		position: "absolute",
		left: gutter,
		right: gutter,
		alignItems: "center",
		zIndex: 9999,
	},
	toast: {
		maxWidth: toast.base.max_width,
		borderRadius: toast.base.radius,
		padding: toast.base.padding,
		...nativeShadowStyle(toast.base.shadow),
	},
	message: {
		...nativeTextStyle(toast.base.text),
		textAlign: "center",
	},
});
