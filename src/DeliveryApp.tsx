import * as React from 'react';
import { LogBox } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import AppContainer from './appContainer';
import settings from './config.json';
import theme from './theme.json';
import { PermissionsProvider } from './context/PermissionsContext';

import { OrderingProvider } from '@components';
import { OToast, OAlertOriginal as Alert, ThemeProvider, StoreMethods, OfflineActionsProvider } from '@ui';

const { _retrieveStoreData, _removeStoreData } = StoreMethods

LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  'Non-serializable values were found in the navigation state.',
  'Setting a timer',
  'The `value` prop is required for the `<Context.Provider>`',
  "Can't perform a React state update",
  'Remote debugger',
  'Task orphaned for request',
  "JSON value '<null>'",
  'VirtualizedLists should never be nested',
  'Could not receive settings from Segment',
  'No info about this app',
  'ViewPropTypes will be removed',
  'EdgeInsetsPropTypes will be removed',
  'EdgeInsetsPropType will be removed',
  'PointPropTypes will be removed',
  'PointPropType will be removed',
  'ColorPropType will be removed'
]);

theme.images = {
  logos: {
    background: require('./assets/images/background.png'),
    logotype: require('./assets/images/logotype.png'),
    logotypeInvert: require('./assets/images/logotype-invert.png'),
    passwordInputIcon: require('./assets/icons/password.png'),
    emailInputIcon: require('./assets/icons/email.png'),
    logo: require('./assets/images/logo.png'),
  },
  general: {
    loadingSplash: require('./assets/images/loading-splash.png'),
    notFound: require('./assets/images/not-found.png'),
    dropDown: require('./assets/icons/drop_down.png'),
    imageChat: require('./assets/icons/image-chat.png'),
    attach: require('./assets/icons/attach.png'),
    arrow_left: require('./assets/icons/arrow_left.png'),
    arrow_down: require('./assets/icons/arrow_down.png'),
    map: require('./assets/icons/map.png'),
    chevronDown: require('./assets/icons/chevron-down.png'),
    inputPhone: require('./assets/icons/phone_input.png'),
    arrowReturnLeft: require('./assets/icons/arrow_return_left.png'),
    driverImage: require('./assets/images/cursor-fill.png'),
    close: require('./assets/icons/Close.png'),
    arrow_distance: require('./assets/icons/Up_arrow.png'),
    pdfFile: require('./assets/icons/pdfFile.png'),
    docFile: require('./assets/icons/docFile.png'),
    imageFile: require('./assets/icons/imageFile.png'),
    cellphone: require('./assets/icons/cellphone.png'),
    reload: require('./assets/icons/reload.png'),
    search: require('./assets/icons/search.png'),
    camera: require('./assets/icons/camera.png'),
    profilephoto: require('./assets/icons/profile-default-photo.png'),
    orders: require('./assets/icons/orders.png'),
    messages: require('./assets/icons/messages.png'),
    stores: require('./assets/icons/stores.png'),
    profile: require('./assets/icons/profile.png'),
    menulogout: require('./assets/icons/logout.png'),
    project: require('./assets/icons/project.png'),
    chronometer: require('./assets/icons/chronometer.png'),
    newOrder: require('./assets/images/new-order.png'),
    orderCreating: require('./assets/images/order-creating.png'),
    orderSuccess: require('./assets/images/order-success.png'),
    clock1: require('./assets/icons/clock1.png'),
    clockRisk: require('./assets/icons/clock-history1.png'),
    clockDelayed: require('./assets/icons/clock-fill1.png'),
    noNetwork: require('./assets/images/no-network.png'),
    deliveryWaiting: require('./assets/images/delivery-waiting.png'),
    ordersGroup: require('./assets/icons/orders_group.png'),
    send: require('./assets/icons/send.png'),
    pen: require('./assets/icons/pen.png'),
  },
  backgroundsImages: {
    login: require('./assets/images/background.png'),
  },
  dummies: {
    businessLogo: require('./assets/images/dummies/store.png'),
    driverPhoto:
      'https://res.cloudinary.com/demo/image/fetch/c_thumb,g_face,r_max/https://www.freeiconspng.com/thumbs/driver-icon/driver-icon-14.png',
    customerPhoto:
      'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,r_max/d_avatar.png/non_existing_id.png',
  },
  tutorials: {
    slide1: require('./assets/images/slide1.png'),
    slide2: require('./assets/images/slide2.png'),
    slide3: require('./assets/images/slide3.png'),
    slide4: require('./assets/images/slide4.png'),
    slide5: require('./assets/images/slide5.png')
  }
};

theme.sounds = {
  notification: require('./assets/sounds/notification.mp3')
}

LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
  'Non-serializable values were found in the navigation state.',
  'Setting a timer',
  'The `value` prop is required for the `<Context.Provider>`',
  "Can't perform a React state update",
  'Remote debugger',
  'Task orphaned for request',
  'Possible Unhandled Promise Rejection',
]);

const DeliveryApp = () => {
  const [configStore, setConfigStore] = React.useState({ loading: settings.use_root_point })
  const [configFile, setConfigFile] = React.useState<any>(settings)

  const manageProjectAction = async () => {
    let project: any = null
    try {
      setConfigStore({ ...configStore, loading: true })
      if (settings.use_root_point) {
        project = await _retrieveStoreData('project_name')
      } else {
        await _removeStoreData('project_name')
      }

      if (project) {
        setConfigFile({ ...configFile, project })
        configFile.project = project
      }
      setConfigStore({ ...configFile, loading: false })
    } catch (error) {
      setConfigStore({ ...configFile, loading: false })
    }
  }

  React.useEffect(() => {
    manageProjectAction()
  }, []);

  React.useEffect(() => {
    if (!configStore.loading || !settings.use_root_point) {
      SplashScreen.hide();
    }
  }, [configStore]);

  return (
    <ThemeProvider theme={theme}>
      <OrderingProvider settings={configFile} Alert={Alert}>
        <OfflineActionsProvider>
          <PermissionsProvider>
            <AppContainer />
            <OToast />
          </PermissionsProvider>
        </OfflineActionsProvider>
      </OrderingProvider>
    </ThemeProvider>
  );
};

export default DeliveryApp;
