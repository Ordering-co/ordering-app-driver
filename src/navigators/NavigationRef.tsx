import * as React from 'react';

export const navigationRef: any = React.createRef();

/**
 * Opens a screen from outside React (a push notification). A screen already
 * open in the stack is gone back to, as React Navigation 6's `navigate` did:
 * 7 pushes a second one unless it is told to `pop`.
 */
export const navigate = (name: string, params: any) => {
  navigationRef.current?.navigate(name, params, { pop: true });
};

/** The screen in front, whatever navigator it is in (`undefined` before the navigation is ready). */
export const currentRoute = (): { name: string, params?: any } | undefined =>
  navigationRef.current?.getCurrentRoute?.();

/**
 * The keys of the routes in front, from the root navigator to the screen that is focused: a tab's stack is in front with its
 * top screen, and so is the tab navigator that holds it. A route that is not in this list is not on screen (covered by another,
 * popped, or in a tab that is not the one in front). `[]` before the navigation is ready.
 */
export const focusedRouteKeys = (): string[] => {
  const keys: string[] = [];
  let state = navigationRef.current?.getRootState?.();
  while (state?.routes?.length) {
    const route = state.routes[state.index ?? state.routes.length - 1];
    if (!route) break;
    keys.push(route.key);
    state = route.state;
  }
  return keys;
};

/** The order whose chat is the screen in front, if a chat is. */
export const openChatOrderId = (): number | undefined => {
  const route = currentRoute();
  if (route?.name !== 'OrderMessage') return undefined;
  const id = Number(route.params?.orderId ?? route.params?.order?.id);
  return Number.isFinite(id) ? id : undefined;
};

/** What the Orders tab is asked to show: the list of the orders, or the assign requests' one. */
export type OrdersTabRequest = 'orders' | 'requests';

/**
 * Takes the driver to the Orders tab and asks it to select a list, from any tab and from any screen of the
 * stack (the stack is popped to the tabs first). The tab reads the request from its route's params (`MyOrders`);
 * `at` makes two asks for the same list two different params, so the second one is also seen.
 */
export const openOrdersTab = (show: OrdersTabRequest, status?: number) => {
  navigate('BottomTab', { screen: 'Orders', params: { show, status, at: Date.now() } });
};

/** Takes the driver to the Messages tab, from any tab and from any screen of the stack. */
export const openMessagesTab = () => {
  navigate('BottomTab', { screen: 'Messages' });
};
