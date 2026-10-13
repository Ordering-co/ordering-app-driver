import React, { useContext } from 'react';
import { View, Platform, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconFA from 'react-native-vector-icons/FontAwesome5'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'styled-components/native';

import { useLanguage } from '@components';
import { OIcon, OText } from '@ui';

import Profile from '../pages/Profile';
import MyOrders from '../pages/MyOrders';
import Messages from '../pages/Messages';
import MapView from '../pages/MapView'
import RequestPermissions from '../pages/RequestPermissions';
import { PermissionsContext } from '../context/PermissionsContext';

import { BottomTabIconContainer } from './styles';

const Tab = createBottomTabNavigator();

const BottomNavigator = () => {
  const [, t] = useLanguage();
  const theme = useTheme();
  const { isGrantedPermissions } = useContext(PermissionsContext);
  const insets = useSafeAreaInsets();

  const isIos = Platform.OS === 'ios';
  const isTablet = (Platform as any).isPad;
  const windowHeight = Dimensions.get('window').height;

  const bottomPadding = isIos
    ? (windowHeight < 845 ? 20 : 30)
    : (insets.bottom > 0 ? insets.bottom : 0);
  const tabBarHeight = isIos
    ? (windowHeight < 845 ? 80 : 90)
    : (70 + bottomPadding);

  const styles = StyleSheet.create({
    bottomTabs: {
      backgroundColor: theme.colors.white,
      borderTopWidth: 1,
      borderTopColor: theme.colors.tabBar,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.36,
      shadowRadius: 6.87,
      elevation: 11,
      paddingBottom: bottomPadding,
      height: tabBarHeight,
    },
    tabIconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      paddingTop: 10
    }
  });

  const IconComponent: any = (props: any) => {
    return props.type === 'orders'
      ? <IconFA {...props} />
      : <OIcon {...props} />
  }

  const iconsData: any = {
    orders: {
      icon: {
        name: 'list-alt',
        size: 20,
        style: { marginBottom: 2 }
      },
      text: t('ORDERS', 'Orders')
    },
    mapview: {
      icon: {
        src: theme.images.general.map,
        width: 20,
        height: 20,
        style: { marginBottom: 1 }
      },
      text: t('MAP_VIEW', 'Map view')
    },
    messages: {
      icon: {
        src: theme.images.general.messages,
        width: 20,
        height: 20,
        style: { marginBottom: 1 }
      },
      text: t('MESSAGES', 'Messages')
    },
    profile: {
      icon: {
        src: theme.images.general.profile,
        width: 23,
        height: 23,
        style: { marginBottom: 1 }
      },
      text: t('PROFILE', 'Profile')
    }
  }

  const BottomTabIconComponent = ({ color, focused, tabName }: any) => (
    <View style={styles.tabIconContainer}>
      <IconComponent
        type={tabName}
        color={color}
        {...iconsData[tabName].icon}
      />
      <OText
        size={isTablet ? 14 : 12}
        weight={700}
        numberOfLines={1}
        adjustsFontSizeToFit
        color={focused ? theme.colors.textGray : color}
      >
        {iconsData[tabName].text}
      </OText>
    </View>
  )

  return (
    <Tab.Navigator
      initialRouteName="Orders"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.disabled,
        tabBarStyle: styles.bottomTabs,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarItemStyle: isTablet ? { flex: 1 } : null,
        tabBarIconStyle: isTablet ? { width: '100%' } : null,
      }}>
      <Tab.Screen
        name="Orders"
        component={MyOrders}
        options={{
          tabBarLabel: t('ORDERS', 'Orders'),
          tabBarIcon: ({ color, focused }: any) => (
            <BottomTabIconComponent
              tabName='orders'
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MapView"
        component={isGrantedPermissions
          ? MapView
          : RequestPermissions}
        options={{
          tabBarLabel: t('MAP_VIEW', 'Map view'),
          tabBarIcon: ({ color, focused }: any) => (
            <BottomTabIconComponent
              tabName='mapview'
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={Messages}
        options={{
          tabBarLabel: t('MESSAGES', 'Messages'),
          tabBarIcon: ({ color, focused }: any) => (
            <BottomTabIconComponent
              tabName='messages'
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          unmountOnBlur: true,
          tabBarLabel: t('PROFILE', 'Profile'),
          tabBarIcon: ({ color, focused }: any) => (
            <BottomTabIconComponent
              tabName='profile'
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigator;
