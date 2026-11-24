import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { getApps } from 'react-native-map-link';
import { useTheme } from 'styled-components/native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { GoogleMapsParams } from '../../types';
import { formatDuration, isPositionFix, nextTravelMinutes, transformDistance } from '../../utils';

import { MapMarker } from '../MapView/MapMarker';
import { MapZoomControls, useMapZoom } from '../MapView/MapZoomControls';
import { orderStatusVariant } from '../shared/orderStates';
import { DestinationCard, MapParty } from './DestinationCard';

import { useLanguage, useConfig } from '@components';
import {
  OAlertOriginal as Alert,
  OBadge,
  OBottomPopup,
  OButton,
  OFab,
  OListRow,
  ONavbar,
  OSpinner,
  OText,
} from '../shared'
import { FloatingButton } from '../FloatingButton'
import { useLocation } from '../../hooks/useLocation'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { useFloatingButtonInset } from '../../hooks/useFloatingButtonInset';
import {
  bottomBarHeight,
  themeColor,
  themeGutter,
  themeIconSize,
  themeRadius,
  themeSpace,
  themeVisible
} from '@/theme/helpers';

/**
 * The driver's map of an order (a full-screen modal over the order): the screen is the map and nothing
 * else. The top bar has the back arrow every full-screen modal leaves by, the order's two-line title
 * ("Order" over "No. 123", as the order's details) and, at its end, the status badge; the map library's map
 * has the app's markers (`MapMarker`: the stop the card is about and the driver, as discs of their normal size), its zoom, fit and locate buttons at its top right and, over its bottom,
 * the stop the driver is going to as a card (`DestinationCard`: who, where, how far
 * (`visibility.map.distance_bar`: the time as the app writes a duration), "Show in other maps"
 * (`visibility.map.other_maps`), which opens a sheet of the maps apps of the device, and a call). With
 * `showAcceptOrReject` the bottom bar (`FloatingButton`) sits under the map, in the room the theme measures
 * for it.
 */
const driverMapStyles = (theme: any, top: number, bottom: number, barInset: number, barButtons: number, floatBottom: number) => {
  const gutter = themeGutter(theme)
  return StyleSheet.create({
    screen: { flex: 1, paddingTop: top, backgroundColor: themeColor(theme, 'background') },
    fill: { flex: 1 },
    fabs: { gap: themeSpace(theme, 'sm') },
    // The buttons at the map's top right, `lg` under the bar and on the page gutter, where the map tab has them.
    controls: {
      position: 'absolute',
      top: themeSpace(theme, 'lg'),
      right: gutter,
      alignItems: 'flex-end',
      gap: themeSpace(theme, 'sm'),
    },
    // The destination card, `sm` from the map's sides (the boards' 10), over the map's bottom.
    cardRoom: { position: 'absolute', left: themeSpace(theme, 'sm'), right: themeSpace(theme, 'sm'), bottom: floatBottom },
    // The room of the bottom bar pinned under the map: the bar's exact height, so the map ends where the bar starts.
    barRoom: { height: bottomBarHeight(theme, bottom, barButtons || 1, barInset) },
    // The sheet owns its sides and bottom (`OBottomPopup padded`): only the space between its pieces is here.
    sheet: { gap: themeSpace(theme, 'sm') },
    spinner: { alignSelf: 'center' },
    appIcon: {
      width: themeIconSize(theme, 'lg'),
      height: themeIconSize(theme, 'lg'),
      borderRadius: themeRadius(theme, 'xs'),
    },
  })
}

export const DriverMap = (props: GoogleMapsParams) => {
  const {
    location,
    markerTitle,
    handleOpenMapView,
    showAcceptOrReject,
    order,
    isBusinessMarker,
    isToFollow,
    handleViewActionOrder,
    driverUpdateLocation,
    setDriverUpdateLocation,
    getOrderStatus,
    logisticOrderStatus
  } = props;

  const { top, bottom } = useSafeAreaInsets();
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const [configState] = useConfig();
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const mapRef = useRef<MapView>(null);
  const following = useRef<boolean>(true);
  const autoFit = useRef<boolean>(true);
  // The estimated travel time, in minutes; null while there is none to trust (the row shows no time).
  const [travelMinutes, setTravelMinutes] = useState<number | null>(null);
  const [distancesFromTwoPlacesKm, setDistancesFromTwoPlacesKm] = useState(0);
  const [popUp, setPopUp] = useState<boolean>(false);
  const [mapApps, setMapApps] = useState<Array<any> | null>(null);
  // The height of the destination card and the width of the buttons' column, measured: the map keeps its own marks
  // above the card and frames its markers clear of both (a disc never sits under a button).
  const [cardHeight, setCardHeight] = useState(0)
  const [controlsWidth, setControlsWidth] = useState(0)

  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [], key: null });
  const distanceUnit = configState?.configs?.distance_unit?.value
  const isHideRejectButtons = configState?.configs?.reject_orders_enabled && configState?.configs?.reject_orders_enabled?.value !== '1'
  const showExternalId = configState?.configs?.change_order_id?.value === '1'
  const { orderNumberShort } = useSecureOrderId()
  // The buttons of the bottom bar: accept, and reject unless the server turns it off.
  const barButtons = showAcceptOrReject ? (isHideRejectButtons ? 1 : 2) : 0
  // The space the bottom bar (FloatingButton) keeps under its buttons.
  const barInset = useFloatingButtonInset()
  // Where what floats over the map's end sits: above the space a bottom bar keeps under its buttons, or right over the bar's room.
  const floatBottom = themeSpace(theme, 'sm') + (barButtons ? 0 : barInset)
  const styles = useMemo(() => driverMapStyles(theme, top, bottom, barInset, barButtons, floatBottom), [theme, top, bottom, barInset, barButtons, floatBottom]);
  // With the card the map keeps its marks above the card and the room it sits in (which already holds the system's bar).
  const cardRoom = cardHeight > 0 ? floatBottom + cardHeight : null
  // The buttons' column sits on the page gutter at the map's end: the map keeps that side, and `sm` more, for it.
  const controlsRoom = controlsWidth > 0 ? themeGutter(theme) + controlsWidth + themeSpace(theme, 'sm') : 0
  const mapPadding = useMemo(
    () => ({ top: 0, right: controlsRoom, left: 0, bottom: cardRoom ?? (barButtons ? 0 : bottom) }),
    [controlsRoom, cardRoom, barButtons, bottom]
  );

  const {
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

  // The app's own zoom buttons (the Map tab's): they zoom from the region the map last settled on.
  const { setRegion, zoomIn, zoomOut } = useMapZoom(mapRef, {
    latitudeDelta: 0.001,
    longitudeDelta: 0.001 * ASPECT_RATIO,
  })

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
    setDistancesFromTwoPlacesKm(distanceInKm);
    // Meters over meters per second, in minutes, only when the position is a fix and the speed
    // and the result are believable (`nextTravelMinutes`): a driver who is standing, or whose
    // device does not know its speed, keeps the last estimate; with no fix there is none.
    setTravelMinutes(previous => isPositionFix(userLocation)
      ? nextTravelMinutes(previous, distance, userLocation?.speed)
      : null);
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

  /** The maps apps of the device, each with the function that opens the route in it. */
  const openOtherMaps = async () => {
    setMapApps(null)
    setPopUp(true)
    try {
      const apps = await getApps({
        latitude: parsedDestination()?.latitude,
        longitude: parsedDestination()?.longitude,
        sourceLatitude: parsedUserLocation()?.latitude,
        sourceLongitude: parsedUserLocation()?.longitude,
        alwaysIncludeGoogle: true,
        naverCallerName: 'co.ordering.delivery',
      })
      setMapApps(apps)
    } catch {
      setMapApps([])
    }
  }

  const showStatus = !order?.isLogistic && (!order?.order_group_id || !logisticOrderStatus?.includes(order?.status))
  const distanceLabel = () => `${transformDistance(distancesFromTwoPlacesKm, distanceUnit)} ${t(distanceUnit.toUpperCase(), distanceUnit)}`
  // The stop the map points at: the marker names it (a pending order's marker is the store though `isBusinessMarker` is off).
  const party: MapParty = (location?.type ? location.type === 'Business' : isBusinessMarker) ? 'business' : 'customer'

  return (
    <View style={styles.screen}>
      <ONavbar
        title={order ? t('ORDER', 'Order') : undefined}
        subtitle={order ? orderNumberShort(order, showExternalId) || undefined : undefined}
        onBack={() => handleArrowBack()}
        right={Boolean(order) && showStatus ? (
          <OBadge variant={orderStatusVariant(order?.status)} testID='driver-map-status'>
            {getOrderStatus(order?.status, t)?.value}
          </OBadge>
        ) : undefined}
      />
      <View style={styles.fill}>
        <View style={styles.fill}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: parsedInitialPosition()?.latitude,
              longitude: parsedInitialPosition()?.longitude,
              latitudeDelta: 0.001,
              longitudeDelta: 0.001 * ASPECT_RATIO,
            }}
            style={StyleSheet.absoluteFill}
            // Without the bottom bar the map runs under the system's bar: the map's own marks (Google's logo) stay above it.
            mapPadding={mapPadding}
            zoomTapEnabled
            zoomEnabled
            // The library's own zoom buttons (Android): the app draws its own, as the Map tab does.
            zoomControlEnabled={false}
            // A tap on a marker does not move the map (the library's default would center on the marker, the driver's own included):
            // the Map tab frames the stop it opens a card for itself, and the driver's disc takes no tap.
            moveOnMarkerPress={false}
            onRegionChangeComplete={setRegion}
            onTouchStart={() => (following.current = false)}>
            {location ? (
              <>
                {/* Nothing on the order's map is "selected": the stop is drawn as every marker of the Map tab. */}
                <MapMarker
                  party={party}
                  latitude={parsedDestination()?.latitude}
                  longitude={parsedDestination()?.longitude}
                />
                <MapMarker
                  party='me'
                  latitude={userLocation?.latitude}
                  longitude={userLocation?.longitude}
                />
              </>
            ) : (
              <MapMarker
                party='me'
                latitude={parsedUserLocation()?.latitude}
                longitude={parsedUserLocation()?.longitude}
                label={markerTitle || t('YOUR_LOCATION', 'Your Location')}
              />
            )}
          </MapView>
          <View
            style={styles.controls}
            pointerEvents='box-none'
            testID='driver-map-controls'
            onLayout={(event) => setControlsWidth(Math.round(event.nativeEvent.layout.width))}
          >
            <MapZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />
            {themeVisible(theme, 'business_map.recenter') && (
              <View style={styles.fabs}>
                <OFab
                  iconName='globe-sharp'
                  onPress={fitCoordinatesZoom}
                  accessibilityLabel={t('FIT_ROUTE', 'Fit the route')}
                />
                <OFab
                  iconName='car-sport-sharp'
                  onPress={centerPosition}
                  accessibilityLabel={t('CENTER_ON_MY_POSITION', 'Center on my position')}
                />
              </View>
            )}
          </View>
          <View
            style={styles.cardRoom}
            pointerEvents='box-none'
            testID='driver-map-card-room'
            onLayout={(event) => setCardHeight(Math.round(event.nativeEvent.layout.height))}
          >
            <DestinationCard
              order={order}
              party={party}
              fallbackName={location?.title}
              distance={themeVisible(theme, 'map.distance_bar') ? distanceLabel() : null}
              time={themeVisible(theme, 'map.distance_bar') && travelMinutes !== null ? formatDuration(travelMinutes, t) : null}
              onOtherMaps={themeVisible(theme, 'map.other_maps') ? openOtherMaps : undefined}
              offered={Boolean(showAcceptOrReject)}
              logisticOrderStatus={logisticOrderStatus}
            />
          </View>
        </View>
        {showAcceptOrReject && <View style={styles.barRoom} testID='driver-map-bar-room' />}
        {showAcceptOrReject && (
          <FloatingButton
            btnText={t('REJECT', 'Reject')}
            secondButtonClick={() =>
              handleViewActionOrder && handleViewActionOrder('accept')
            }
            firstButtonClick={() =>
              handleViewActionOrder && handleViewActionOrder('reject')
            }
            secondBtnText={t('ACCEPT', 'Accept')}
            secondButton={true}
            isPadding
            isHideRejectButtons={isHideRejectButtons}
          />
        )}
        <OBottomPopup
          open={popUp}
          onClose={() => setPopUp(false)}
          title={t('SHOW_IN_OTHER_MAPS', 'Show in other maps')}
          padded
        >
          <View style={styles.sheet} testID='driver-map-sheet'>
            <OText preset='body' color='text_muted'>
              {t('WHAT_APP_WOULD_YOU_USE', 'What app would you like to use?')}
            </OText>
            {mapApps === null
              ? <OSpinner style={styles.spinner} testID='driver-map-apps-loading' />
              : mapApps.map((app: any, index: number) => (
                <OListRow
                  key={app.id}
                  title={app.name}
                  last={index === mapApps.length - 1}
                  trailing={<Image source={app.icon} style={styles.appIcon} />}
                  onPress={() => {
                    setPopUp(false)
                    // An app that cannot open the route leaves the map as it is.
                    Promise.resolve(app.open()).catch(() => {})
                  }}
                />
              ))}
            <OButton
              color='neutral'
              appearance='outline'
              text={t('CANCEL', 'Cancel')}
              onClick={() => setPopUp(false)}
            />
          </View>
        </OBottomPopup>
        <Alert
          open={alertState.open}
          notice
          onAccept={closeAlert}
          onClose={closeAlert}
          content={alertState.content}
          title={t('ERROR', 'Error')}
        />
      </View>
    </View>
  );
};
