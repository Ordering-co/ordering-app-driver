import React, { useState, useEffect, useContext, useRef } from 'react';
import { Platform, AppState, Vibration, View, NativeModules, DeviceEventEmitter } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  getMessaging,
  getToken,
  getInitialNotification,
  onNotificationOpenedApp,
  onMessage,
  onTokenRefresh
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from 'react-native-notify-kit';
import { RESULTS, request, requestMultiple, requestNotifications } from 'react-native-permissions';
import { locationRationale } from './locationRationale';

import settings from '../config.json';
import { setSecureOrderProject } from '../utils';
import { useTemporaryBannersWarning } from '../utils/notificationBannerStyle';
import * as RootNavigation from '../navigators/NavigationRef';

import {
  ToastType,
  useSession,
  useConfig,
  useOrder,
  useApi,
  useLanguage,
  useToast,
  useWebsocket
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
import { StoreMethods } from '../providers/StoreUtil';
import { getDriverScheduleBlockPlan } from './getDriverScheduleBlockPlan';
import { INITIAL_GENERAL_PROJECT_STATE, getStoredProjectSettedPatch } from './getProjectSwitchPlan';
import { getPushOpenOrderPlan } from './getPushOpenOrderPlan';
import { getOpenedPushOrderData, isFirebasePushEnabled } from './firebasePushConsent';
import { createOneSignalPush, type OneSignalPush, type PushState } from './oneSignalPush';
import { oneSignalSmsNumber } from './oneSignalSms';
import { createPushProviderSwitch, getDesiredPushProvider } from './pushProviderSwitch';
import { findNotificationTokenId, getNotificationTokensUrl } from './notificationTokens';
import { useDriverLocationTracking } from './useDriverLocationTracking';
import { LAUNCH_NOTICE_MS, useLaunchTimeLimit } from './useLaunchTimeLimit';
import { hideSplash } from '../utils/splash';
import { isLocalSimulatorMode } from '../onboarding/ios-local-mode';
import { DriverLocationDialog } from '../ui/src/components/DriverLocationDialog';
import { presentConfirm } from '../ui/src/components/shared/confirmAction';
import { ConfirmDialogHost } from '../ui/src/components/shared/ConfirmDialogHost';

const { _setStoreData, _retrieveStoreData, _removeStoreData } = StoreMethods

const Stack = createStackNavigator();

const DriverLocation = ({ blockedSchedule, isDriverLoginValidated }: { blockedSchedule: boolean; isDriverLoginValidated: boolean }) => {
  const locationDialog = useDriverLocationTracking({ blockedSchedule, driverLoginValidated: isDriverLoginValidated })
  return <DriverLocationDialog {...locationDialog} />
}

const RootNavigator = ({ configuredLocalProject = false }: { configuredLocalProject?: boolean } = {}) => {
  const localSimulator = isLocalSimulatorMode()
  const [languageState, t] = useLanguage();
  const socket = useWebsocket()
  const [{ user, auth, loading: sessionLoading, token }, { logout, refreshUserInfo }] = useSession();
  const [orderStatus] = useOrder();
  const [{ configs, loading: configsLoading }] = useConfig();
  const [ordering] = useApi()
  const [, { showToast }] = useToast()

  const isDriverLoginValidated = configs?.driver_login_validation?.value === '1'

  const [isTutorial, setTutorial] = useState(!configuredLocalProject && settings.show_tutorials)

  const { permissions, checkLocationPermission, getPermissions, isGrantedPermissions } = useContext(PermissionsContext);

  const [orderId, setOrderId] = useState({
    id: null,
    assignId: null,
    group_id: null
  });
  const [loaded, setLoaded] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState({ loading: !localSimulator });
  const [pendingBannerCheck, setPendingBannerCheck] = useState(false);
  const [oneSignalState, setOneSignalState] = useState<any>({
    notification_app: settings.notification_app,
  });
  const [permissionsState, setPermissionsState] = useState({
    isGranted: false,
    isDenied: false,
    isLoading: !localSimulator,
    error: null,
  });
  // The system's permission dialogs are up (the driver may leave one open: that is not a launch that hangs).
  const [permissionsPrompting, setPermissionsPrompting] = useState(false)
  const [blockedSchedule, setBlockedSchedule] = useState(false)
  const [nextSchedule, setNextSchedule] = useState<any>({ schedule: null, day: null })
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [generalProjectState, setGeneralProjectState] = useState(INITIAL_GENERAL_PROJECT_STATE)
  const oneSignalPushRef = useRef<OneSignalPush | null>(null)
  const pushProviderSwitchRef = useRef<ReturnType<typeof createPushProviderSwitch> | null>(null)
  const firebaseSetupGenerationRef = useRef(0)
  const didSetupFirebaseRef = useRef(false)
  const firebaseSetupInFlightRef = useRef(false)
  const firebaseUnsubscribersRef = useRef<Array<() => void>>([])
  const notificationTokenRef = useRef<string | null>(null)

  const _handleAppStateChange = async (nextAppState: any) => {
    if (localSimulator) return
    auth && settings?.validate_developer_mode && handleIsDeveloperMode()
    if (nextAppState === 'active' || nextAppState.match(/inactive|background/)) {
      user?.id && refreshUserInfo()
    }
    if (nextAppState === 'active' && permissionsState.isDenied && Platform.OS === 'ios') {
      checkPermissions(true)
    }
  }

  // OneSignal for this mount of the navigator (src/DeliveryApp.tsx mounts it again when the API
  // comes back): its listeners leave with it. The calls live in oneSignalPush.ts.
  useEffect(() => {
    if (localSimulator) return
    const oneSignalPush = createOneSignalPush({
      storage: {
        get: _retrieveStoreData,
        set: _setStoreData,
        remove: _removeStoreData
      },
      notificationApp: settings.notification_app,
      onState: (state: PushState | null) => {
        notificationTokenRef.current = state?.notification_token ?? null
        setOneSignalState(state ?? { notification_app: settings.notification_app })
      },
      onNotificationClick: (notification: any) => {
        setOrderId(getOpenedPushOrderData(notification?.additionalData))
      },
      onPermissionGranted: () => setPendingBannerCheck(true)
    })
    const pushProviderSwitch = createPushProviderSwitch()
    oneSignalPushRef.current = oneSignalPush
    pushProviderSwitchRef.current = pushProviderSwitch
    return () => {
      pushProviderSwitch.stop()
      oneSignalPush.dispose()
      oneSignalPushRef.current = null
      pushProviderSwitchRef.current = null
    }
  }, []);

  // Deletes a token's row in notification_tokens while the session is open (after a logout the
  // API deleted it with the token the logout sent: LogoutButton).
  const unregisterNotificationToken = async (notificationToken: string) => {
    const tokensUrl = getNotificationTokensUrl(ordering?.root, user?.id)
    if (!token || !notificationToken || !tokensUrl) {
      return
    }
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
    const response = await fetch(tokensUrl, { headers })
    const content = await response.json()
    const tokenId = findNotificationTokenId(content, notificationToken)
    if (tokenId != null) {
      await fetch(`${tokensUrl}/${tokenId}`, { method: 'DELETE', headers })
    }
  };

  const oneSignalSetup = async () => {
    setIsPushLoading({ loading: true });
    try {
      await oneSignalPushRef.current?.setup({
        appId: configs?.onesignal_deliveryapp_id?.value,
        externalId: `${ordering?.project}-${user?.id}`,
        email: user?.email,
        sms: oneSignalSmsNumber(user)
      })
    } finally {
      setIsPushLoading({ loading: false });
    }
  };

  // The driver logged out (or the project left OneSignal): the subscription opts out and the
  // external id logs out, so the next driver of this phone is the only one pushes reach.
  const oneSignalTeardown = async () => {
    await oneSignalPushRef.current?.teardown(unregisterNotificationToken)
  };

  const firebasePushSetup = async () => {
    const generation = ++firebaseSetupGenerationRef.current
    firebaseSetupInFlightRef.current = true
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

    // A teardown (or a newer setup) came while the token was being fetched: it owns the state now.
    if (generation !== firebaseSetupGenerationRef.current) {
      return
    }

    const nextState: PushState = {
      notification_app: settings.notification_app,
      notification_token: fcmToken,
      notification_provider: 'fcm'
    }
    notificationTokenRef.current = fcmToken
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
        const refreshedState: PushState = {
          notification_app: settings.notification_app,
          notification_token: newToken,
          notification_provider: 'fcm'
        }
        notificationTokenRef.current = newToken
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

    didSetupFirebaseRef.current = true
    firebaseSetupInFlightRef.current = false
    setIsPushLoading({ loading: false });
  };

  // The driver logged out, or the project moved to OneSignal: Firebase's listeners leave, and the
  // token's row goes while the session is open (a logout deletes it through LogoutButton). The
  // device's FCM token stays: the next setup reads it again.
  const firebasePushTeardown = async () => {
    firebaseSetupGenerationRef.current += 1
    didSetupFirebaseRef.current = false
    firebaseSetupInFlightRef.current = false
    firebaseUnsubscribersRef.current.forEach(unsubscribe => {
      try {
        unsubscribe()
      } catch (error) {
        console.log('Firebase push unsubscribe error:', error)
      }
    })
    firebaseUnsubscribersRef.current = []

    const fcmToken = notificationTokenRef.current
    if (fcmToken) {
      try {
        await unregisterNotificationToken(fcmToken)
      } catch (error) {
        console.log('Firebase token unsubscribe error:', error)
      }
    }

    notificationTokenRef.current = null
    setOneSignalState({ notification_app: settings.notification_app })
    _removeStoreData('notification_state')
  };

  // The iOS banner-style alert (decision 2026-11-17): once per launch with a session and once
  // per login, never before a login. A push setup asks for it (permission granted); the ref
  // lets only the first ask of a session through, whatever number of setups follow.
  const warnIfTemporaryBanners = useTemporaryBannersWarning()
  const bannerCheckedRef = useRef(false)

  useEffect(() => {
    if (!auth) {
      bannerCheckedRef.current = false
      setPendingBannerCheck(false)
    }
  }, [auth])

  useEffect(() => {
    if (pendingBannerCheck && auth && loaded && !permissionsState.isLoading) {
      setPendingBannerCheck(false)
      if (bannerCheckedRef.current) return
      bannerCheckedRef.current = true
      warnIfTemporaryBanners()
    }
  }, [pendingBannerCheck, auth, loaded, permissionsState.isLoading])

  const checkPermissions = async (removeDenied: boolean) => {
    if (localSimulator) return
    setPermissionsPrompting(true)
    try {
      const { title: titlePermission, message: descriptionPermission } = locationRationale()
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
    } finally {
      setPermissionsPrompting(false)
    }
  }

  const permissionsSetup = async () => {
    if (localSimulator) return
    setPermissionsPrompting(true)
    try {
      setPermissionsState({
        ...permissionsState,
        isLoading: true,
      });
      await requestMultiple(getPermissions());

      await checkPermissions(false)

    } catch (error: any) {
      setPermissionsState({
        ...permissionsState,
        isLoading: false,
        error,
      });
    } finally {
      setPermissionsPrompting(false)
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
    if (localSimulator) return
    const oneSignalAppId = configs?.onesignal_deliveryapp_id?.value
    const desired = getDesiredPushProvider({
      configsLoading,
      firebaseEnabled: isFirebasePushEnabled(configs),
      oneSignalAppId,
      auth
    })
    if (desired === undefined) {
      return
    }
    if (desired === null) {
      // No push for this project, or nobody signed in: the app does not wait for it.
      setIsPushLoading({ loading: false });
    }
    // One provider at a time: the other one's teardown ends before the setup starts; a logout
    // (desired null) tears down whichever one is active.
    pushProviderSwitchRef.current?.sync(desired, {
      onesignal: {
        setup: oneSignalSetup,
        teardown: oneSignalTeardown,
        isActive: () => !!oneSignalPushRef.current?.isActive()
      },
      fcm: {
        setup: async () => {
          // A OneSignal subscription left from before the project switched to Firebase.
          await oneSignalPushRef.current?.retireStaleSubscription(oneSignalAppId, unregisterNotificationToken)
          // Set up with its token: nothing to do when the configs load again, or its listeners would pile up.
          if (didSetupFirebaseRef.current && notificationTokenRef.current) {
            return
          }
          await firebasePushSetup()
        },
        teardown: firebasePushTeardown,
        isActive: () => didSetupFirebaseRef.current || firebaseSetupInFlightRef.current
      }
    })
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
      let data: any
      try {
        data = await _retrieveStoreData('isTutorial');
      } catch (error) {
        data = undefined
      }
      if (data === false) {
        setTutorial(false);
        permissionsSetup();
      } else {
        // The tutorial has not been done (or its flag cannot be read): the permissions are asked after it
        // (`permissionsSetup` above runs when it ends), so there is nothing to wait for now. Without this,
        // a launch with no stored flag and the location already granted (the system's "Clear storage") kept
        // `isLoading` on for good: the next effect only clears it when the location is not granted.
        setPermissionsState((state) => ({ ...state, isLoading: false }))
      }
    };
    setTutorialLocal();
  }, [isTutorial])

  useEffect(() => {
    if (!localSimulator && permissions?.locationStatus === 'unavailable') {
      checkLocationPermission()
    }
  }, [permissions?.locationStatus])

  useEffect(() => {
    const _event = AppState.addEventListener('change', _handleAppStateChange);
    return () => {
      _event.remove()
    };
  }, [])

  // Without the permission the splash must not wait for it (it used to end here, with the SDK's setup).
  useEffect(() => {
    if (languageState?.loading || isGrantedPermissions) return
    setPermissionsState({ ...permissionsState, isLoading: false })
  }, [isGrantedPermissions, token, languageState?.loading])

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
    if (!localSimulator && auth && settings.validate_developer_mode){
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
      presentConfirm({
        title: t('DEVELOPER_MODE', 'Developer mode'),
        message: t('PLEASE_DISABLE_DEVELOPER_MODE', 'Please disable developer mode for sign in'),
        acceptText: t('GO_TO_SETTINGS', 'Go to settings'),
        cancelText: t('OK', 'Ok'),
        onAccept: async () => await NativeModules.DeveloperOptions?.openDeveloperSettings(),
      })
    }
  }

  // A launch the API never answers (it accepts the connection and stays silent) goes on with what
  // is cached after the limit: the app (or the welcome screen without a session) in place of the
  // loading page, the native splash gone and one notice, and what waits for an answer runs when
  // it comes (useLaunchTimeLimit).
  const launched = useLaunchTimeLimit({
    loaded,
    permissionsLoading: permissionsState.isLoading,
    permissionsPrompting,
    sessionLoading,
    onLimit: ({ loaded: answered }) => {
      hideSplash()
      // Only a launch the API did not answer is a network problem: one that had loaded and was stuck on the
      // permissions is let go without blaming it.
      if (!answered) showToast(ToastType.Error, t('NETWORK_ERROR', 'Network Error'), LAUNCH_NOTICE_MS)
    }
  })

  return (
    <View style={{ flex: 1 }}>
      {!localSimulator && <DriverLocation blockedSchedule={blockedSchedule} isDriverLoginValidated={isDriverLoginValidated} />}
      {/* The app's confirmations and notices, over every screen (they are never the system's alerts). */}
      <ConfirmDialogHost />
      <Stack.Navigator>
        {!launched && (
          <Stack.Screen
            name="Splash"
            component={Splash}
            options={{ headerShown: false }}
          />
        )}

        {launched && (
          <>
            {!auth ? (
              <>
                {isTutorial ? (
                  <Stack.Screen
                    name="IntroductoryTutorial"
                    component={IntroductoryTutorial}
                    options={{ headerShown: false }}
                    initialParams={{ setTutorial }}
                  />) : !configuredLocalProject && (
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
