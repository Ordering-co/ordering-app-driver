import React, { useState, useEffect, useContext, useRef } from 'react';
import { Platform, AppState, Vibration, View, NativeModules, Alert, DeviceEventEmitter } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import OneSignal from 'react-native-onesignal';
import {
  getMessaging,
  getToken,
  getInitialNotification,
  onNotificationOpenedApp,
  onMessage,
  onTokenRefresh
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import BackgroundGeolocation, { Subscription } from "react-native-background-geolocation";
import { RESULTS, request, requestMultiple, openSettings, requestNotifications } from 'react-native-permissions';
import NetInfo from '@react-native-community/netinfo';
import RNConfigReader from 'rn-config-reader';

import { useLocation } from '../hooks/useLocation';
import settings from '../config.json';
import { setSecureOrderProject } from '../utils';
import * as RootNavigation from '../navigators/NavigationRef';

import {
  useSession,
  useConfig,
  useOrder,
  useApi,
  useLanguage,
  useWebsocket,
  useToast,
  ToastType
} from '@components';

import HomeNavigator from './HomeNavigator';
import IntroductoryTutorial from '../pages/IntroductoryTutorial';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Forgot from '../pages/ForgotPassword';
import Splash from '../pages/Splash';
import { PermissionsContext } from '../context/PermissionsContext';
import { areAllPermissionResultsGranted } from '../context/areAllPermissionResultsGranted';
import { ScheduleBlocked } from '../pages/ScheduleBlocked';
import RequestPermissions from '../pages/RequestPermissions';
import { StoreMethods } from '../providers/StoreUtil';
import { getDriverScheduleBlockPlan } from './getDriverScheduleBlockPlan';
import { INITIAL_GENERAL_PROJECT_STATE, getStoredProjectSettedPatch } from './getProjectSwitchPlan';
import { getPushOpenOrderPlan } from './getPushOpenOrderPlan';
import { getOpenedPushOrderData, isFirebasePushEnabled } from './firebasePushConsent';
import { getBackgroundGeolocationRunPlan } from './getBackgroundGeolocationRunPlan';
import moment from 'moment';

const { _setStoreData, _retrieveStoreData, _removeStoreData } = StoreMethods

const Stack = createStackNavigator();

const RootNavigator = () => {
  const [languageState, t] = useLanguage();
  const socket = useWebsocket()
  const [{ user, auth, loading: sessionLoading, token }, { logout, refreshUserInfo }] = useSession();
  const [orderStatus, { handleLogEvent }] = useOrder();
  const [{ configs, loading: configsLoading }] = useConfig();
  const [ordering] = useApi()
  const [, { showToast }] = useToast()

  const isDriverLoginValidated = configs?.driver_login_validation?.value === '1'

  const [isTutorial, setTutorial] = useState(settings.show_tutorials)

  const { followUserLocation, getCurrentLocation } = useLocation();
  const { permissions, checkLocationPermission, getPermissions, isGrantedPermissions } = useContext(PermissionsContext);

  let netInfoSuscription: any = null;

  const [orderId, setOrderId] = useState({
    id: null,
    assignId: null,
    group_id: null
  });
  const [loaded, setLoaded] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState({ loading: true });
  const [pendingBannerCheck, setPendingBannerCheck] = useState(false);
  const [oneSignalState, setOneSignalState] = useState<any>({
    notification_app: settings.notification_app,
  });
  const [connectionState, setConnectionState] = useState<{
    type: string;
    connection_status: boolean;
    isInternetReachable?: boolean
  } | null>(null);
  const [permissionsState, setPermissionsState] = useState({
    isGranted: false,
    isDenied: false,
    isLoading: true,
    error: null,
  });
  const [enabled, setEnabled] = useState({ enabled: false, ready: false });
  const [blockedSchedule, setBlockedSchedule] = useState(false)
  const [nextSchedule, setNextSchedule] = useState<any>({ schedule: null, day: null })
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [generalProjectState, setGeneralProjectState] = useState(INITIAL_GENERAL_PROJECT_STATE)
  const firebaseUnsubscribersRef = useRef<Array<() => void>>([])

  const updateDriverLocation = async () => {
    if (!user) return
    try {
      const location = await getCurrentLocation()
      if (!location?.latitude || !location?.longitude) {
        showToast(t('ERROR_UPDATING_COORDS', 'Error updating coords'), ToastType.Error)
        return
      }
      await fetch(`${ordering.root}/users/${user.id}/locations`, {
        method: 'POST',
        body: JSON.stringify({
          location: JSON.stringify({ lat: location.latitude, lng: location.longitude, mock: location.mocked, v: '1.0' }),
          driver_id: user.id
        }),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
    } catch { }
  }

  const _handleAppStateChange = async (nextAppState: any) => {
    auth && settings?.validate_developer_mode && handleIsDeveloperMode()
    if (nextAppState === 'active' || nextAppState.match(/inactive|background/)) {
      updateDriverLocation()
      user?.id && refreshUserInfo()
    }
    if (nextAppState === 'active' && permissionsState.isDenied && Platform.OS === 'ios') {
      checkPermissions(true)
    }
    if (nextAppState === 'background' && loaded) {
      handleLogEvent(JSON.stringify([{
        event: 'set_app_in_background',
        author_id: user?.id,
        data: { platform: Platform.OS }
      }]))
    }
  }

  const handleConnectivityChange = (state: any) => {
    setConnectionState({ connection_status: state.isConnected, isInternetReachable: state.isInternetReachable, type: state.type });
  };

  const oneSignalSetup = async () => {
    setIsPushLoading({ loading: true });
    OneSignal.setLogLevel(6, 0);
    const data = {
      appId: configs?.onesignal_deliveryapp_id?.value,
      externalId: `${ordering?.project}-${user?.id}`,
      email: user?.email,
      cellphone: user?.cellphone
        ? user?.country_phone_code
          ? `+${user?.country_phone_code} ${user?.cellphone}`
          : user?.cellphone
        : ''
    }

    OneSignal.setNotificationOpenedHandler(({ notification }: any) => {
      setOrderId({
        id: notification?.additionalData?.order_id,
        assignId: notification?.additionalData?.assign_request_id,
        group_id: notification?.additionalData?.order_group_id
      })
    });

    OneSignal.addSubscriptionObserver((event: any) => {
      if (event?.to?.userId) {
        setOneSignalState({
          ...oneSignalState,
          notification_token: event?.to?.userId,
        });
        _setStoreData('notification_state', {
          ...oneSignalState,
          notification_token: event?.to?.userId,
        });
      }
      if (!event.to?.isSubscribed) {
        OneSignal.addTrigger('prompt_ios', 'true');
        OneSignal.promptForPushNotificationsWithUserResponse(() => { });
      }
    });

    OneSignal.setAppId(data.appId);

    try {
      if (data.email) {
        OneSignal.setEmail(data.email);
      }

      if (data.cellphone) {
        OneSignal.setSMSNumber(data.cellphone);
      }

      if (data.externalId) {
        OneSignal.setExternalUserId(data.externalId);
      }
    } catch (error) {
      console.log('OneSignal setup error:', error);
    }

    const deviceState: any = await OneSignal.getDeviceState();

    if (!deviceState?.hasNotificationPermission) {
      OneSignal.addTrigger("notification_prompt", "true")
      OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
        if (accepted) setPendingBannerCheck(true)
      });
    } else {
      setPendingBannerCheck(true)
    }

    setOneSignalState({
      ...oneSignalState,
      notification_token: deviceState?.userId,
    });

    if (deviceState?.userId) {
      _setStoreData('notification_state', {
        ...oneSignalState,
        notification_token: deviceState?.userId,
      });
    }

    setIsPushLoading({ loading: false });
  };

  const firebasePushSetup = async () => {
    setIsPushLoading({ loading: true });
    const messaging = getMessaging()

    requestNotifications(['alert', 'sound', 'badge'])
      .then((permission) => {
        if (permission?.status === 'granted') {
          setPendingBannerCheck(true)
        }
      })
      .catch((error) => {
        console.log('Firebase push permission error:', error)
      })

    let fcmToken: string | null = null
    try {
      fcmToken = await getToken(messaging)
    } catch (error) {
      console.log('Firebase push token error:', error)
    }

    const nextState = {
      ...oneSignalState,
      notification_token: fcmToken,
      notification_provider: 'fcm'
    }
    setOneSignalState(nextState);

    if (fcmToken) {
      _setStoreData('notification_state', nextState);
    }

    firebaseUnsubscribersRef.current.forEach(unsubscribe => {
      try {
        unsubscribe()
      } catch (error) {
        console.log('Firebase push unsubscribe error:', error)
      }
    })
    firebaseUnsubscribersRef.current = [
      onNotificationOpenedApp(messaging, (remoteMessage: any) => {
        setOrderId(getOpenedPushOrderData(remoteMessage?.data))
      }),
      onMessage(messaging, async (remoteMessage: any) => {
        if (Platform.OS !== 'android' || !remoteMessage?.notification) {
          return
        }
        try {
          await notifee.displayNotification({
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            data: remoteMessage.data || {},
            android: {
              channelId: 'new_order_alarm',
              smallIcon: 'ic_launcher',
              pressAction: { id: 'default' },
              importance: AndroidImportance.HIGH
            }
          })
        } catch (error) {
          console.log('Firebase foreground display error:', error)
        }
      }),
      notifee.onForegroundEvent(({ type, detail }: any) => {
        if (type === EventType.PRESS) {
          setOrderId(getOpenedPushOrderData(detail?.notification?.data))
        }
      }),
      onTokenRefresh(messaging, (newToken: string) => {
        const refreshedState = {
          ...oneSignalState,
          notification_token: newToken,
          notification_provider: 'fcm'
        }
        setOneSignalState(refreshedState);
        _setStoreData('notification_state', refreshedState);
      })
    ]

    getInitialNotification(messaging)
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          setOrderId(getOpenedPushOrderData(remoteMessage?.data))
        }
      })
      .catch((error: any) => {
        console.log('Firebase initial notification error:', error)
      })

    setIsPushLoading({ loading: false });
  };

  const checkNotificationBannerStyle = async () => {
    if (Platform.OS !== 'ios') return
    const NotificationSettings = NativeModules?.NotificationSettings
    if (!NotificationSettings?.getAlertStyle) return
    try {
      const style = await NotificationSettings.getAlertStyle()
      if (style === 'temporary') {
        Alert.alert(
          t('PERSISTENT_NOTIFICATIONS_TITLE', 'Enable persistent notifications'),
          t(
            'PERSISTENT_NOTIFICATIONS_MESSAGE',
            'To avoid missing orders, set the banner style to "Persistent" in Settings > Notifications.'
          ),
          [
            { text: t('LATER', 'Later'), style: 'cancel' },
            { text: t('GO_TO_SETTINGS', 'Go to settings'), onPress: () => openSettings().catch(() => { }) }
          ]
        )
      }
    } catch (err: any) {
      console.log('Banner style check error - ', err?.message)
    }
  }

  useEffect(() => {
    if (pendingBannerCheck && loaded && !permissionsState.isLoading) {
      setPendingBannerCheck(false)
      checkNotificationBannerStyle()
    }
  }, [pendingBannerCheck, loaded, permissionsState.isLoading])

  const checkPermissions = async (removeDenied: boolean) => {
    try {
      const titlePermission = !RNConfigReader?.driver_location_permission_title || RNConfigReader?.driver_location_permission_title === 'ALLOW_DRIVER_APP_ACCESS_LOCATION' ? 'Allow Driver App to access this device\'s location even when closed or not in use?' : RNConfigReader?.driver_location_permission_title
      const descriptionPermission = !RNConfigReader?.description_driver_location_permission || RNConfigReader?.description_driver_location_permission === 'DESCRIPTION_DRIVER_APP_ACCESS_LOCATION' ? 'This app collects location data for locate drivers, stores and customers' : RNConfigReader?.description_driver_location_permission
      const statuses = await Promise.all(
        getPermissions().map(async (permission: any) => {
          if (permission === 'android.permission.ACCESS_FINE_LOCATION') {
            return request(permission, {
              title: titlePermission,
              message: descriptionPermission,
              buttonPositive: 'Ok'
            })
          }
          return request(permission)
        })
      )
      const isPermissionsGranted = areAllPermissionResultsGranted(statuses, RESULTS.GRANTED)
      if (isPermissionsGranted) {
        setPermissionsState({
          ...permissionsState,
          isGranted: true,
          isDenied: removeDenied ? false : permissionsState.isDenied,
          isLoading: false
        })

      } else {
        setPermissionsState({
          ...permissionsState,
          isDenied: true,
          isLoading: false
        })
      }

    } catch (error: any) {
      setPermissionsState({
        ...permissionsState,
        isLoading: false,
        error
      })
    }
  }

  const permissionsSetup = async () => {
    try {
      setPermissionsState({
        ...permissionsState,
        isLoading: true,
      });
      const requestMultipleRes = await requestMultiple(getPermissions());

      checkPermissions(false)

    } catch (error: any) {
      setPermissionsState({
        ...permissionsState,
        isLoading: false,
        error,
      });
    }
  };

  useEffect(() => {
    const plan = getPushOpenOrderPlan({ loaded, auth, orderId })
    if (plan.screen === 'OrderDetailsLogistic') {
      RootNavigation.navigate('OrderDetailsLogistic', {
        orderAssingId: plan.orderAssingId,
        isFromRoot: true,
      });
    }
    if (plan.screen === 'OrderDetails') {
      RootNavigation.navigate('OrderDetails', {
        orderId: plan.orderId,
        isDriverNotification: true,
        isFromRoot: true,
      });
    }
    if (plan.shouldClear) {
      setOrderId({
        id: null,
        assignId: null,
        group_id: null
      });
    }
  }, [loaded, orderId, auth]);

  useEffect(() => {
    if (!loaded && !orderStatus.loading && !isPushLoading.loading && !loadingSchedule) {
      setLoaded(true);
    }
  }, [orderStatus, isPushLoading, loadingSchedule]);

  useEffect(() => {
    if (!sessionLoading && !isPushLoading.loading && !auth) {
      setLoaded(!auth);
    }
  }, [sessionLoading, isPushLoading]);

  useEffect(() => {
    if (configsLoading) {
      return;
    }
    const firebaseEnabled = isFirebasePushEnabled(configs)
    if (firebaseEnabled && auth) {
      firebasePushSetup();
      return;
    }
    if (!firebaseEnabled && configs?.onesignal_deliveryapp_id?.value && auth) {
      oneSignalSetup();
    }
    if ((!firebaseEnabled && !configs?.onesignal_deliveryapp_id?.value) || !auth) {
      setIsPushLoading({ loading: false });
    }
  }, [configsLoading, configs?.onesignal_deliveryapp_id?.value, configs?.firebase_push_enabled?.value, auth]);

  const subscribePushNotifications = async () => {
    setIsPushLoading({ loading: true });
    try {
      const url = `${ordering.root}/users/${user.id}/notification_tokens`
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          token: oneSignalState.notification_token,
          user_id: user.id,
          app: oneSignalState.notification_app,
          ...(oneSignalState.notification_provider
            ? { provider: oneSignalState.notification_provider }
            : {})
        })
      })
      setIsPushLoading({ loading: false });
    } catch (err) {
      setIsPushLoading({ loading: false });
    }
  }

  useEffect(() => {
    if (auth && oneSignalState.notification_token) {
      subscribePushNotifications()
    }
  }, [oneSignalState.notification_token, auth]);

  useEffect(() => {
    const setTutorialLocal = async () => {
      const data = await _retrieveStoreData('isTutorial');
      if (data === false) {
        setTutorial(false);
        permissionsSetup();
      }
    };
    setTutorialLocal();
  }, [isTutorial])

  useEffect(() => {
    if (permissions?.locationStatus === 'unavailable') {
      checkLocationPermission()
    }
  }, [permissions?.locationStatus])

  useEffect(() => {
    const _event = AppState.addEventListener('change', _handleAppStateChange);
    return () => {
      _event.remove()
    };
  }, [])

  useEffect(() => {
    netInfoSuscription = NetInfo.addEventListener(handleConnectivityChange);
    return () => {
      netInfoSuscription && netInfoSuscription();
    };
  }, []);

  useEffect(() => {
    const handleGetInternetReachable = async () => {
      if (!connectionState?.isInternetReachable && connectionState?.type === 'none') {
        await _setStoreData('disconnected_at', JSON.stringify(moment().format('YYYY-MM-DD hh:mm:s')))
      }
      const disconnected_at = await _retrieveStoreData('disconnected_at');
      if (connectionState?.isInternetReachable && disconnected_at) {
        handleLogEvent(JSON.stringify([{
          event: 'turn_off_mobile_data',
          author_id: user?.id,
          data: { at_local: disconnected_at, platform: Platform.OS }
        }]))
        await _removeStoreData('disconnected_at')
      }
    }
    handleGetInternetReachable()
  }, [connectionState?.isInternetReachable, connectionState?.type])

  const handleBackgroundGeolocation = async () => {
    if (!isGrantedPermissions) {
      setPermissionsState({
        ...permissionsState,
        isLoading: false,
      });
      return;
    }

    if (!token) {
      BackgroundGeolocation.removeListeners();
      return;
    }

    followUserLocation();
    const onLocation: Subscription = BackgroundGeolocation.onLocation((location : any) => {
      console.log(location)
    })

    const onHttpChange: Subscription = BackgroundGeolocation.onHttp((response: any) => {
      console.log(
        '[http] - ',
        response.success,
        response.status,
        response.responseText,
      );
      updateDriverLocation()
      if (!response.success && response.status === 401) {
        logout()
      }
    });

    const backgroundGeolocation = await BackgroundGeolocation.ready({
      reset: true,
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 25,
      foregroundService: true,
      allowIdenticalLocations: false,
      httpRootProperty: 'location',
      locationTemplate:
        '{"lat":<%= latitude %>,"lng":<%= longitude %>, "mock": <%= mock %>, "v": "1.0"}',
      autoSync: true,
      stopOnTerminate: true,
      startOnBoot: true,
      preventSuspend: true,
      locationUpdateInterval: 40000,
      fastestLocationUpdateInterval: 20000,
      stationaryRadius: 10,
      notification: {
        title: 'Background tracking enabled',
        text: 'Important for delivery real time location',
      },
      url: `${ordering.root}/users/${user.id}/locations`,
      extras: { driver_id: user.id },
      headers: {
        Authorization: 'Bearer ' + token,
      },
      locationAuthorizationAlert: {
        titleWhenNotEnabled: t('MOBILE_LOCATION_NOT_ENABLED', 'Mobile location not enabled'),
        titleWhenOff: t('MOBILE_LOCATION_OFF', 'Mobile location off'),
        instructions: t('MOBILE_LOCATION_NOT_ENABLED_DESC', 'Enable location for tracking your orders'),
        cancelButton: t('CANCEL', 'Cancel'),
        settingsButton: t('MOBILE_IOS_SETTINGS', 'Open Settings'),
      },
      locationAuthorizationRequest: 'Always',
      backgroundPermissionRationale: {
        title: t('TITLE_BACKGROUND_LOCATION_PERMISSION', 'Allow {applicationName} to access to this device\'s location when closed or not in use?'),
        message:
          t('MESSAGE_BACKGROUND_LOCATION_PERMISSION', 'If you would like to receive a notification when you are at {applicationName} compatible venue then you\'ll need to enable background tracking location permission'),
        positiveAction: t('POSITIVE_ACTION_LOCATION_PERMISSION', 'Change to "Allow all the time"'),
        negativeAction: t('CANCEL', 'Cancel'),
      }
    })
    if (backgroundGeolocation) {
      setEnabled({ enabled: backgroundGeolocation.enabled, ready: true })
      console.log("- BackgroundGeolocation is configured and ready: ", backgroundGeolocation.enabled);
    }
    return () => {
      onLocation.remove();
      onHttpChange.remove()
    }
  }
  useEffect(() => {
    if (languageState?.loading) return
    handleBackgroundGeolocation()
  }, [isGrantedPermissions, token, languageState?.loading])

  useEffect(() => {
    const plan = getBackgroundGeolocationRunPlan({
      ready: enabled.ready,
      auth,
      userEnabled: user?.enabled,
      blockedSchedule,
      driverLoginValidated: isDriverLoginValidated,
      permissionsGranted: isGrantedPermissions
    })
    if (plan.shouldStart) {
      BackgroundGeolocation.start();
    }
    if (plan.shouldStop) {
      BackgroundGeolocation.stop();
    }
  }, [enabled.ready, auth, user?.enabled, blockedSchedule, isDriverLoginValidated, isGrantedPermissions]);

  useEffect(() => {
    const plan = getDriverScheduleBlockPlan({ user })
    setBlockedSchedule(plan.blocked)
    setNextSchedule(plan.nextSchedule)
    if (user) {
      setLoadingSchedule(false)
    }
  }, [user])

  useEffect(() => {
    setSecureOrderProject(ordering?.project)
    const getProjectName = async () => {
      const data = await _retrieveStoreData('project_name')
      const patch = getStoredProjectSettedPatch(data)
      if (patch) {
        setGeneralProjectState((prevState) => ({ ...prevState, ...patch }))
      }
    }
    getProjectName()
  }, [ordering.project])

  useEffect(() => {
    DeviceEventEmitter.addListener('change_project', (newState: any) => {
      setGeneralProjectState(() => newState)
    })
    return () => {
      DeviceEventEmitter.removeAllListeners('change_project')
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const handleVibrationEffect = (value: any) => {
      const change = value?.history?.[0]?.data?.[0]
      if (value?.driver && change?.attribute === 'driver_id' && change?.old === null) {
        Vibration.vibrate()
      }
    }

    socket.on('update_order', handleVibrationEffect)
    return () => {
      socket.off('update_order', handleVibrationEffect)
    }
  }, [socket, token, user])

  useEffect(() => {
    if (auth && settings.validate_developer_mode){
      handleIsDeveloperMode()
    }
  }, [auth, loaded])

  const handleIsDeveloperMode = async () => {
    const isDeveloperModeEnabled = async (): Promise<boolean> => {
      if (Platform.OS === 'android') {
        return NativeModules.DeveloperOptions?.isDeveloperModeEnabled?.();
      } else {
        throw Error('Platform not supported');
      }
    }

    const isDeveloperMode = await isDeveloperModeEnabled()
    if (isDeveloperMode) {
      logout()
      Alert.alert(
        t('DEVELOPER_MODE', 'Developer mode'),
        t('PLEASE_DISABLE_DEVELOPER_MODE', 'Please disable developer mode for sign in'),
        [{
          text: t('GO_TO_SETTINGS', 'Go to settings'),
          onPress: async () => await NativeModules.DeveloperOptions?.openDeveloperSettings(),
        },
        {text: 'OK', onPress: () => {}},]
      )
    }
  }

  return (
    <View
      style={{ flex: 1 }}
      onTouchEnd={() => updateDriverLocation()}
    >
      <Stack.Navigator>
        {(!loaded || permissionsState.isLoading) && (
          <Stack.Screen
            name="Splash"
            component={Splash}
            options={{ headerShown: false }}
          />
        )}

        {loaded && !permissionsState.isLoading && (
          <>
            {!auth ? (
              <>
                {isTutorial ? (
                  <Stack.Screen
                    name="IntroductoryTutorial"
                    component={IntroductoryTutorial}
                    options={{ headerShown: false }}
                    initialParams={{ setTutorial }}
                  />) : (
                  <Stack.Screen
                    name="Home"
                    component={Home}
                    options={{ headerShown: false }}
                  />
                )}
                <Stack.Screen
                  name="Login"
                  options={{ headerShown: false }}
                  initialParams={{ notification_state: oneSignalState }}
                >
                  {(props: any) => <Login {...props} projectChanged={generalProjectState.changed} />}
                </Stack.Screen>
                <Stack.Screen
                  name="Forgot"
                  component={Forgot}
                  options={{ headerShown: false }}
                />
              </>
            ) : (
              <>
                {blockedSchedule && isDriverLoginValidated ? (
                  <Stack.Screen
                    name="ScheduleBlocked"
                    component={ScheduleBlocked}
                    options={{ headerShown: false }}
                    initialParams={{ nextSchedule }}
                  />
                ) : (
                  <Stack.Screen
                    name="MyAccount"
                    component={HomeNavigator}
                    options={{ headerShown: false }}
                  />
                )}
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </View>
  );
};

export default RootNavigator;
