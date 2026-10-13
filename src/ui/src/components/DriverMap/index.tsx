import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Popup } from 'react-native-map-link';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from 'styled-components/native';
import MapView, {
  PROVIDER_GOOGLE,
  Marker
} from 'react-native-maps';
import { GoogleMapsParams } from '../../types';
import { transformDistance } from '../../utils';

import LocationIndicator from './LocationIndicator';

import { useLanguage, useConfig, useUtils } from '@components';
import { OAlertOriginal as Alert, OIconButton, OIcon, OFab, OText, OButton, FloatingButton, useLocation } from '@ui'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';

export const DriverMap = (props: GoogleMapsParams) => {
  const {
    location,
    maxLimitLocation,
    markerTitle,
    handleOpenMapView,
    showAcceptOrReject,
    saveLocation,
    setSaveLocation,
    order,
    isSetInputs,
    orderStatus,
    isBusinessMarker,
    isToFollow,
    handleViewActionOrder,
    driverUpdateLocation,
    setDriverUpdateLocation,
    colors,
    getOrderStatus,
    logisticOrderStatus
  } = props;

  const { top } = useSafeAreaInsets();
  const theme = useTheme();
  const [, t] = useLanguage();
  const [configState] = useConfig();
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const mapRef = useRef<MapView>(null);
  const following = useRef<boolean>(true);
  const autoFit = useRef<boolean>(true);
  const googleMapsApiKey = configState?.configs?.google_maps_api_key?.value;
  const [travelTime, setTravelTime] = useState(0);
  const [distancesFromTwoPlacesKm, setDistancesFromTwoPlacesKm] = useState(0);
  const [isMin, setIsMin] = useState(false);
  const [{ parseDate }] = useUtils();
  const [popUp, setPopUp] = useState<boolean>(false);
  const mapErrors: any = {
    ERROR_NOT_FOUND_ADDRESS: "Sorry, we couldn't find an address",
    ERROR_MAX_LIMIT_LOCATION_TO: 'Sorry, You can only set the position to',
  };
  const [tracksViewChanges, setTracksViewChanges] = useState(true)

  useEffect(() => {
    setTracksViewChanges(true)
    const timeout = setTimeout(() => {
      setTracksViewChanges(false)
    }, 2500)
    return () => clearTimeout(timeout)
  }, [location?.icon])

  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [], key: null });
  const distanceUnit = configState?.configs?.distance_unit?.value
  const isHideRejectButtons = configState?.configs?.reject_orders_enabled && configState?.configs?.reject_orders_enabled?.value !== '1'
  const showExternalId = configState?.configs?.change_order_id?.value === '1'
  const { displayOrderId } = useSecureOrderId()

  const {
    hasLocation,
    initialPosition,
    followUserLocation,
    getCurrentLocation,
    userLocation,
    stopFollowUserLocation,
  } = useLocation();

  const parsedInitialPosition = useCallback(() => {
    return {
      latitude: typeof initialPosition.latitude === 'string' ? parseFloat(initialPosition.latitude) || 0 : initialPosition.latitude || 0,
      longitude: typeof initialPosition.longitude === 'string' ? parseFloat(initialPosition.longitude) || 0 : initialPosition.longitude || 0,
    }
  }, [JSON.stringify(initialPosition)])

  const parsedUserLocation = useCallback(() => {
    return {
      latitude: typeof userLocation?.latitude === 'string' ? parseFloat(userLocation?.latitude) || 0 : userLocation?.latitude || 0,
      longitude: typeof userLocation?.longitude === 'string' ? parseFloat(userLocation?.longitude) || 0 : userLocation?.longitude || 0
    }
  }, [JSON.stringify(userLocation)])

  const parsedDestination = useCallback(() => {
    return {
      latitude: typeof location?.lat === 'string' ? parseFloat(location?.lat) || 0 : location?.lat || 0,
      longitude: typeof location?.lng === 'string' ? parseFloat(location?.lng) || 0 : location?.lng || 0
    }
  }, [JSON.stringify(location)])

  useEffect(() => {
    if (isToFollow) {
      fitCoordinates();
      followUserLocation();

      return () => {
        stopFollowUserLocation();
      };
    }
  }, []);

  const setMapErrors = (errKey: string) => {
    setAlertState({
      open: true,
      content: !(errKey === 'ERROR_MAX_LIMIT_LOCATION_TO')
        ? [t(errKey, mapErrors[errKey])]
        : [
          `${t(errKey, mapErrors[errKey])} ${maxLimitLocation} ${t(
            'METTERS',
            'meters',
          )}`,
        ],
      key: errKey,
    });
  };

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: [],
    });
  };

  const calculateDistance = (
    pointA: { lat: number; lng: number },
    pointB: { latitude: number; longitude: number },
  ) => {
    const lat1 = pointA.lat;
    const lon1 = pointA.lng;

    const lat2 = pointB.latitude;
    const lon2 = pointB.longitude;

    const R = 6371e3;
    const φ1 = lat1 * (Math.PI / 180);
    const φ2 = lat2 * (Math.PI / 180);
    const Δφ = (lat2 - lat1) * (Math.PI / 180);
    const Δλ = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * (Math.sin(Δλ / 2) * Math.sin(Δλ / 2));

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    const distanceInKm = distance / 1000;
    const estimatedTimeTravel = distance / userLocation.speed / 60;
    const time =
      estimatedTimeTravel > 60 ? estimatedTimeTravel / 60 : estimatedTimeTravel;
    setIsMin(estimatedTimeTravel < 60);
    const timeEstimated = userLocation.speed > 0 ? time : travelTime;
    setDistancesFromTwoPlacesKm(distanceInKm);
    setTravelTime(timeEstimated);
    return distance;
  };

  useEffect(() => {
    if (driverUpdateLocation.error) {
      stopFollowUserLocation();
      setAlertState({
        open: true,
        content: [
          `${driverUpdateLocation.error[0] || driverUpdateLocation.error}. ${t(
            'TRY_AGAIN',
            'Try Again',
          )}`,
        ],
      });
    }
  }, [driverUpdateLocation.error]);

  useEffect(() => {
    if (driverUpdateLocation.error) return;

    calculateDistance(
      { lat: parsedUserLocation()?.latitude, lng: parsedUserLocation()?.longitude },
      parsedDestination(),
    );
    // geocodePosition(userLocation);

    if (!following.current) return;
    fitCoordinates();

    const { latitude, longitude } = parsedUserLocation();

    mapRef.current?.animateCamera({
      center: { latitude, longitude },
    });

  }, [JSON.stringify(userLocation)]);

  const handleArrowBack: any = () => {
    setDriverUpdateLocation?.({
      ...driverUpdateLocation,
      error: null,
      newLocation: null,
    });
    handleOpenMapView && handleOpenMapView();
  };

  const centerPosition = async () => {
    const { latitude, longitude } = await getCurrentLocation();

    following.current = true;
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001 * ASPECT_RATIO,
        },
        2000,
      );

      // mapRef.current?.animateCamera({
      //   center: { latitude, longitude },
      // });
    }
  };

  const fitCoordinates = () => {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: location.lat, longitude: location.lng },
          {
            latitude: parsedInitialPosition()?.latitude,
            longitude: parsedInitialPosition()?.longitude,
          },
        ],
        {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        },
      );
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (parsedInitialPosition()?.latitude !== 0 && autoFit.current) {
        if (mapRef.current) {
          fitCoordinates();
          autoFit.current = false;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [parsedInitialPosition()]);

  const fitCoordinatesZoom = () => {
    following.current = false;
    fitCoordinates();
  };

  const styles = StyleSheet.create({
    map: {
      flex: 1,
      height: '80%',
      ...StyleSheet.absoluteFillObject,
    },
    image: {
      borderRadius: 50,
    },
    view: {
      width: 25,
      position: 'absolute',
      top: 6,
      left: 6,
      bottom: 0,
      right: 0,
    },
    driverIcon: {
      height: 25,
      width: 25,
      backgroundColor: theme.colors.white,
      borderRadius: 100,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonBack: {
      borderRadius: 7.6,
      borderWidth: 0,
      paddingLeft: 0,
    },
    facContainer: {
      position: 'absolute',
      top: 0,
      zIndex: 9999,
      width: '100%',
      backgroundColor: theme.colors.white,
      paddingHorizontal: 20,
    },
    facOrderStatus: {
      flexDirection: 'row',
      borderBottomWidth: 11,
      minHeight: 70,
      borderBottomColor: theme.colors.inputChat,
      paddingVertical: 5,
    },
    facDistance: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    arrowDistance: {
      borderWidth: 0,
    },
    buttonContainer: {
      position: 'absolute',
      right: 0,
      marginTop: top,
    },
    showButton: {
      alignSelf: 'center',
      borderRadius: 10,
    }
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ ...styles.buttonContainer, top: 10 }}>
        <OIconButton
          icon={theme.images.general.close}
          iconStyle={{ width: 48, height: 48 }}
          style={styles.buttonBack}
          onClick={() => handleArrowBack()}
        />
      </View>
      {Boolean(order) && (
        <View style={{ padding: 15 }}>
          <OText numberOfLines={2} size={16} weight="600" style={{ marginBottom: 15, maxWidth: '80%' }}>
            <>
              {`${t('INVOICE_ORDER_NO', 'Order No.')} ${displayOrderId(order, showExternalId)} `}
              {!order?.isLogistic && (!order?.order_group_id || !logisticOrderStatus?.includes(order?.status)) && (
                <>
                  {t('IS', 'is')}{' '}
                  <OText
                    size={16}
                    weight="700"
                    color={colors?.[order?.status] || theme.colors.primary}>
                    {getOrderStatus(order?.status, t)?.value}
                  </OText>
                </>
              )}
            </>
          </OText>
          <LocationIndicator title={order?.business?.name} address={order?.customer?.address} />
          <View style={{ height: 5, backgroundColor: theme.colors.tabBar }} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: parsedInitialPosition()?.latitude,
              longitude: parsedInitialPosition()?.longitude,
              latitudeDelta: 0.001,
              longitudeDelta: 0.001 * ASPECT_RATIO,
            }}
            style={styles.map}
            zoomTapEnabled
            zoomEnabled
            zoomControlEnabled
            moveOnMarkerPress
            onTouchStart={() => (following.current = false)}>
            {location ? (
              <>
                <Marker
                  coordinate={{
                    latitude: parsedDestination()?.latitude,
                    longitude: parsedDestination()?.longitude
                  }}
                  tracksViewChanges={tracksViewChanges}
                  title={location.title}>
                  <Icon
                    name="map-marker"
                    size={50}
                    color={theme.colors.primary}
                  />
                  <View style={styles.view}>
                    <OIcon
                      style={styles.image}
                      src={typeof location.icon === 'number' ? location.icon : { uri: location.icon }}
                      width={25}
                      height={25}
                    />
                  </View>
                </Marker>
                <Marker
                  coordinate={{
                    latitude: userLocation?.latitude,
                    longitude: userLocation?.longitude
                  }}
                  tracksViewChanges={tracksViewChanges}
                >
                  <View style={styles.driverIcon}>
                    <OIcon
                      style={styles.image}
                      src={theme.images.general.driverImage}
                      width={25}
                      height={25}
                    />
                  </View>
                </Marker>
              </>
            ) : (
              <Marker
                coordinate={{
                  latitude: parsedUserLocation()?.latitude,
                  longitude: parsedUserLocation()?.longitude
                }}
                tracksViewChanges={tracksViewChanges}
                title={markerTitle || t('YOUR_LOCATION', 'Your Location')}
              />
            )}
          </MapView>
        </View>

        <OFab
          iconName="globe-sharp"
          onPress={fitCoordinatesZoom}
          style={{
            position: 'absolute',
            bottom: showAcceptOrReject
              ? Platform.OS === 'ios' ? 180 : 280
              : 75,
            right: 20,
          }}
        />
        <OFab
          iconName="car-sport-sharp"
          onPress={centerPosition}
          style={{
            position: 'absolute',
            bottom: showAcceptOrReject
              ? Platform.OS === 'ios' ? 140 : 240
              : 35,
            right: 20,
          }}
        />
        <View style={styles.facContainer}>
          <View style={styles.facDistance}>
            <View
              style={{
                width: '20%',
                alignItems: 'center',
                marginRight: 10,
              }}>
              <OIcon
                src={theme.images.general.arrow_distance}
                style={styles.arrowDistance}
              />
              <OText size={12} numberOfLines={3}>
                {`${transformDistance(distancesFromTwoPlacesKm, distanceUnit)} ${t(distanceUnit.toUpperCase(), distanceUnit)}`}
              </OText>

            </View>
            <View style={{ width: '75%', paddingRight: 20 }}>
              <OText
                color={theme.colors.unselectText}
                size={13}
                numberOfLines={2}
                adjustsFontSizeToFit>
                {`${travelTime.toFixed(2)} - ${isMin ? t('MINUTES', 'mins') : t('HOURS', 'hours')}`}
              </OText>
            </View>
          </View>
        </View>
        <View style={{
          ...styles.buttonContainer,
          alignItems: 'center',
          width: '100%',
          bottom: showAcceptOrReject ? 150 : 10
        }}>
          <OButton
            imgRightSrc=''
            textStyle={{ color: theme.colors.white }}
            style={styles.showButton}
            onClick={() => setPopUp(true)}
            text={t('SHOW_IN_OTHER_MAPS', 'Show in other maps')}
          />
          <Popup
            isVisible={popUp}
            onCancelPressed={() => setPopUp(false)}
            onAppPressed={() => setPopUp(false)}
            onBackButtonPressed={() => setPopUp(false)}
            modalProps={{
              animationIn: 'slideInUp'
            }}
            options={{
              latitude: parsedDestination()?.latitude,
              longitude: parsedDestination()?.longitude,
              sourceLatitude: parsedUserLocation()?.latitude,
              sourceLongitude: parsedUserLocation()?.longitude,
              alwaysIncludeGoogle: true,
              naverCallerName: 'com.deliveryapp',
              dialogTitle: t('SHOW_IN_OTHER_MAPS', 'Show in other maps'),
              dialogMessage: t('WHAT_APP_WOULD_YOU_USE', 'What app would you like to use?'),
              cancelText: t('CANCEL', 'Cancel'),
            }}
          />
        </View>
        {showAcceptOrReject && (
          <FloatingButton
            btnText={t('REJECT', 'Reject')}
            isSecondaryBtn={false}
            secondButtonClick={() =>
              handleViewActionOrder && handleViewActionOrder('accept')
            }
            firstButtonClick={() =>
              handleViewActionOrder && handleViewActionOrder('reject')
            }
            secondBtnText={t('ACCEPT', 'Accept')}
            secondButton={true}
            firstColorCustom={theme.colors.red}
            secondColorCustom={theme.colors.green}
            widthButton={'100%'}
            isPadding
            isHideRejectButtons={isHideRejectButtons}
          />
        )}
        <Alert
          open={alertState.open}
          onAccept={closeAlert}
          onClose={closeAlert}
          content={alertState.content}
          title={t('ERROR', 'Error')}
        />
      </View>
    </SafeAreaView>
  );
};
