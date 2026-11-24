import * as React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'styled-components/native';

import { useSession, useWebsocket, useApi } from '@components';
import { ConnectionHost, NewOrderNotification } from '@ui';

import BottomNavigator from '../navigators/BottomNavigator';
import OrderDetails from '../pages/OrderDetails';
import OrderMessage from '../pages/OrderMessage';
import AcceptOrRejectOrder from '../pages/AcceptOrRejectOrder';
import Splash from '../pages/Splash';
import RequestPermissions from '../pages/RequestPermissions';
import OrderDetailsLogistic from '../pages/OrderDetailsLogistic';
import Sessions from '../pages/Sessions';
import StripeConnectAccount from '../pages/StripeConnectAccount';
import Payouts from '../pages/Payouts';
import ProfileEdit from '../pages/ProfileEdit';
import ProfilePassword from '../pages/ProfilePassword';
import Schedule from '../pages/Schedule';
import OrdersRoute from '../pages/OrdersRoute';
import OrdersRouteStops from '../pages/OrdersRouteStops';
import { themeVisible } from '../theme/helpers';
import { SocketReconnectProvider } from '../context/SocketReconnectContext';

const Stack = createStackNavigator();

const HomeNavigator = () => {
  const [ordering] = useApi()
  const [{ loading, user }] = useSession();
  const socket = useWebsocket();

  // The route of the orders in progress is an option of the theme (`orders.route`): hidden, its screens are not in the stack.
  const theme: any = useTheme();
  const showRoute = themeVisible(theme, 'orders.route');

  // The rooms the signed-in driver listens to. They belong to the user (and the project), not to the connection: the socket
  // wrapper keeps every room it was asked to join, asks for them again on each `connect` and holds the joins made before the
  // connection exists, so a drop or a return of the network needs nothing from here. The cleanup leaves exactly what this run
  // joined (the wrapper counts joins and matches an object room by its content), so the rooms do not outlive the user.
  const userId = user?.id;
  const userLevel = user?.level;
  const project = ordering?.project;
  React.useEffect(() => {
    if (!userId) return undefined;
    const rooms: Array<string | Record<string, unknown>> = [
      userLevel === 0 ? 'orders' : `orders_${userId}`,
      userLevel === 0 ? 'messages_orders' : `messages_orders_${userId}`,
      { project, room: 'drivers', user_id: userId, role: 'driver' }
    ];
    rooms.forEach((room) => socket.join(room));
    return () => {
      rooms.forEach((room) => socket.leave(room));
    };
  }, [socket, userId, userLevel, project]);

  // The new-order alert belongs to the signed-in app, not to a tab: it is mounted here, once, over whatever screen is in
  // front (a modal opened from a tab that is not focused is not shown on iOS). The reconnect provider tells the screens
  // to load again what they show when the socket comes back. The connection sheet (`ConnectionHost`) is hosted the same
  // way: the pill of the Orders header only asks for it to open.
  return (
    <SocketReconnectProvider>
      <Stack.Navigator>
        {!loading ? (
          <>
            <Stack.Screen
              name="BottomTab"
              component={BottomNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderDetails"
              component={OrderDetails}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderDetailsLogistic"
              component={OrderDetailsLogistic}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AcceptOrRejectOrder"
              component={AcceptOrRejectOrder}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderMessage"
              component={OrderMessage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name='RequestPermissions'
              component={RequestPermissions}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Sessions"
              component={Sessions}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="StripeConnectAccount"
              component={StripeConnectAccount}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Payouts"
              component={Payouts}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfileEdit"
              component={ProfileEdit}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfilePassword"
              component={ProfilePassword}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Schedule"
              component={Schedule}
              options={{ headerShown: false }}
            />
            {showRoute && (
              <>
                <Stack.Screen
                  name="OrdersRoute"
                  component={OrdersRoute}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="OrdersRouteStops"
                  component={OrdersRouteStops}
                  options={{ headerShown: false }}
                />
              </>
            )}
          </>
        ) : (
          <Stack.Screen
            name="Splash"
            component={Splash}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
      {!loading && <NewOrderNotification />}
      {!loading && <ConnectionHost />}
    </SocketReconnectProvider>
  );
};

export default HomeNavigator;
