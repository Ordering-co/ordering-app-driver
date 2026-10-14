import * as React from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { createStackNavigator } from '@react-navigation/stack';

import { useSession, useWebsocket, useApi } from '@components';

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

const Stack = createStackNavigator();

const HomeNavigator = () => {
  const [ordering] = useApi()
  const [{ loading, user }] = useSession();
  const socket = useWebsocket();

  const netInfo = useNetInfo();

  React.useEffect(() => {
    if (user?.id && netInfo.isConnected) {
      const ordersRoom = user?.level === 0 ? 'orders' : `orders_${user?.id}`;
      socket.join(ordersRoom);
      const messagesOrdersRoom =
      user?.level === 0 ? 'messages_orders' : `messages_orders_${user?.id}`;
      socket.join(messagesOrdersRoom);
      socket.join({
        project: ordering.project,
        room: 'drivers',
        user_id: user?.id,
        role: 'driver'
      })
    }
  }, [socket, user?.id, netInfo.isConnected]);

  return (
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
        </>
      ) : (
        <Stack.Screen
          name="Splash"
          component={Splash}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
};

export default HomeNavigator;
