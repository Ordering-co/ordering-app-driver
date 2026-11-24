import React, { useCallback, useContext, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useIsFocused, useNavigationState, useRoute } from '@react-navigation/native';
import { useTheme } from 'styled-components/native';

import { useLanguage } from '@components';
import { Icon, OBadge, OText } from '@ui';
import { bottomBarBox, nativeBoxStyle, nativeTextStyle, themeColor, themeSpace, themeVisible } from '../theme/helpers';

import Profile from '../pages/Profile';
import MyOrders from '../pages/MyOrders';
import Messages from '../pages/Messages';
import MapView from '../pages/MapView'
import RequestPermissions from '../pages/RequestPermissions';
import { PermissionsContext } from '../context/PermissionsContext';
import { useReportBottomBar } from '../context/BottomBarContext';
import { UnreadMessagesProvider, unreadMessagesText, useUnreadMessages } from '../context/UnreadMessagesContext';

const Tab = createBottomTabNavigator();

/** The text cap of the app's texts (`OText`): the bar grows with its label up to it. */
const FONT_SCALE_CAP = 1.3;

/**
 * A tab's icon, declared once: built inside the navigator it was a new
 * component type on every render, and the icons remounted. One kind of icon
 * for the four tabs: a glyph at `bottom_nav.icon_size`, in the bar's active or
 * inactive color. A tab with a `badge` (the Messages tab's unread count) wears
 * it as a count badge over the glyph's top end.
 */
const TabBarIcon = ({ name, focused, nav, badge }: { name: string, focused: boolean, nav: any, badge?: string }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    // Over the glyph's upper end, so the badge never changes where the glyph or the label sits.
    badge: { position: 'absolute', top: -themeSpace(theme, 'sm'), left: nav.icon_size / 2 },
  }), [theme, nav.icon_size])
  return (
    <View>
      <Icon name={name} size={nav.icon_size} color={focused ? nav.active : nav.inactive} />
      {!!badge && <OBadge count style={styles.badge} testID='tab-badge'>{badge}</OBadge>}
    </View>
  )
}

/** The `tabBarIcon` option of a tab: React Navigation calls it with the tab's state. */
const tabBarIcon = (name: string, nav: any, badge?: string) =>
  ({ focused }: { focused: boolean }) => <TabBarIcon nav={nav} name={name} focused={focused} badge={badge} />

/** A tab's label (`bottom_nav.label_text`) in the tab's color, on one line; it is also what a screen reader says. */
const tabLabel = (text: string, style: any, detail?: string) => ({
  tabBarAccessibilityLabel: detail ? `${text}, ${detail}` : text,
  tabBarLabel: ({ color, focused }: { color: string, focused: boolean }) => (
    // The tab you are on is semibold: its cell is fixed, so the heavier label moves nothing.
    <OText style={style} color={color} weight={focused ? 600 : undefined} numberOfLines={1} adjustsFontSizeToFit>{text}</OText>
  ),
})

/**
 * What `unmountOnBlur` did in React Navigation 6 (removed in 7): the screen's
 * content leaves the tree while its tab is not the navigator's focused one, and
 * is built again when the tab opens. It is the tab that counts, not
 * `useIsFocused`: a stack screen pushed over the tabs (Sessions, Payouts…) does
 * not blur the tab it was opened from.
 */
const UnmountOnBlur = ({ children }: { children: React.ReactNode }) => {
  const { key } = useRoute();
  const focusedKey = useNavigationState((state) => state.routes[state.index].key);
  return focusedKey === key ? <>{children}</> : null;
};

/** The `layout` of a tab that starts over every time it is opened. */
const unmountOnBlur = ({ children }: { children: React.ReactNode }) => <UnmountOnBlur>{children}</UnmountOnBlur>;

/**
 * The Map tab's screen: the map while the location is granted, the permissions request while it is not, chosen
 * here from the permissions context, the moment the context says it (the tab keeps its place in the bar). The
 * context asks the system again when the app comes back to the foreground; the tab asks again whenever it
 * opens, so a permission taken away while the app ran (a map with no location to draw is a blank screen) never
 * outlives the driver's next look at the tab.
 */
const MapTab = (props: any) => {
  const { isGrantedPermissions, checkLocationPermission } = useContext(PermissionsContext);
  useFocusEffect(useCallback(() => {
    checkLocationPermission?.()
  }, [checkLocationPermission]));
  return isGrantedPermissions ? <MapView {...props} /> : <RequestPermissions {...props} />;
};

const Tabs = () => {
  const [, t] = useLanguage();
  const theme: any = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  // `components.bottom_nav`: the bar is its height above the space under the labels.
  const nav = theme.native.components.bottom_nav.base
  const showLabels = themeVisible(theme, 'bottom_nav.labels')
  const labelGrowth = showLabels ? Math.ceil(nav.label_text.lineHeight * (Math.min(fontScale, FONT_SCALE_CAP) - 1)) : 0

  const styles = useMemo(() => StyleSheet.create({
    bar: {
      // Grows with the label when the system text is larger; the space under the labels
      // is the system inset or at least `min_bottom_space` (`bottomBarBox`).
      ...bottomBarBox({ height: nav.height, padding: nav.padding_y, inset: insets.bottom, min: nav.min_bottom_space, growth: labelGrowth }),
      paddingTop: nav.padding_y,
      paddingHorizontal: nav.padding_x,
      ...nativeBoxStyle({ background: nav.background, shadow: nav.shadow }),
      borderTopWidth: nav.border_top.borderWidth,
      ...(nav.border_top.borderColor && { borderTopColor: nav.border_top.borderColor }),
    },
    label: nativeTextStyle(nav.label_text),
    hidden: { display: 'none' },
    scene: { backgroundColor: themeColor(theme, 'background') },
  }), [theme, nav, insets.bottom, labelGrowth]);

  // The unread messages the Messages list knows of (the list reports them; nothing is shown before it has loaded).
  // Past the pages it has loaded the total is a lower bound, written with a "+".
  const unread = useUnreadMessages()
  const unreadBadge = unread && unread.total > 0 ? `${unread.total}${unread.more ? '+' : ''}` : undefined
  const unreadText = unread && unreadBadge !== undefined ? unreadMessagesText(t, unread.total, unread.more) : undefined

  // The toast rides above the bar while the tabs are what is on screen (not under a screen pushed over them).
  const isOnScreen = useIsFocused()
  useReportBottomBar('tabs', isOnScreen ? styles.bar.height : 0)

  // Map view and Messages can be hidden by the theme (`bottom_nav.map`, `bottom_nav.messages`):
  // the tab leaves the bar, its screen stays registered for redirects. Orders and Profile never.
  const hiddenTab = { tabBarButton: () => null, tabBarItemStyle: styles.hidden }

  // The tabs are lazy: a screen is built the first time its tab opens. The Messages tab is the one exception, because
  // its list is what the tab's unread count comes from: built at launch, the count is there before the driver opens
  // the tab, and the list (kept in the tree, as a tab is not unmounted on blur) keeps it fresh from the socket. When
  // the theme hides the tab there is no badge to feed, so it stays lazy and costs no call.
  const messagesVisible = themeVisible(theme, 'bottom_nav.messages')

  return (
    <Tab.Navigator
      initialRouteName="Orders"
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarActiveTintColor: nav.active,
        tabBarInactiveTintColor: nav.inactive,
        tabBarStyle: styles.bar,
        tabBarShowLabel: showLabels,
        tabBarLabelPosition: 'below-icon',
      }}>
      <Tab.Screen
        name="Orders"
        component={MyOrders}
        options={{
          ...tabLabel(t('ORDERS', 'Orders'), styles.label),
          tabBarIcon: tabBarIcon('receipt-outline', nav),
        }}
      />
      <Tab.Screen
        name="MapView"
        component={MapTab}
        options={{
          ...tabLabel(t('MAP_VIEW', 'Map view'), styles.label),
          tabBarIcon: tabBarIcon('map-outline', nav),
          ...(!themeVisible(theme, 'bottom_nav.map') && hiddenTab),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={Messages}
        options={{
          ...tabLabel(t('MESSAGES', 'Messages'), styles.label, unreadText),
          tabBarIcon: tabBarIcon('chatbubbles-outline', nav, unreadBadge),
          lazy: !messagesVisible,
          ...(!messagesVisible && hiddenTab),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        layout={unmountOnBlur}
        options={{
          ...tabLabel(t('PROFILE', 'Profile'), styles.label),
          tabBarIcon: tabBarIcon('person-outline', nav),
        }}
      />
    </Tab.Navigator>
  );
};

/** The tab bar, with the room the Messages list reports its unread count in. */
const BottomNavigator = () => (
  <UnreadMessagesProvider>
    <Tabs />
  </UnreadMessagesProvider>
);

export default BottomNavigator;
