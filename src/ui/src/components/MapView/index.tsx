import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from 'styled-components/native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapViewParams } from '../../types';

import { useLanguage, MapView as MapViewController } from '@components';
import { useLocation } from '../../hooks/useLocation'
import { OAlertOriginal as Alert, OCard, OFab, OText } from '../shared'
import { MapZoomControls, useMapZoom } from './MapZoomControls'
import { RenderMarker, type MarkerKey } from './RenderMarker'
import { MarkerCard } from './MarkerCard'
import { MapMarker } from './MapMarker'
import { pickupGroups } from './pickupGroups'
import { nativeShadowStyle, themeColor, themeControlHeight, themeGutter, themeRadius, themeSpace } from '@/theme/helpers'

/**
 * The Map tab: the map library's tiles with the app's own UI over them: the
 * markers (`MapMarker`: the tapped one larger and above the others), the count of orders on the map, the zoom buttons
 * (`visibility.map.zoom_controls`) with the one that centers the map on the
 * driver, and, when a marker is tapped, its card at the bottom (`MarkerCard`).
 * The map keeps its own marks (Google's logo) above the card: the card's height
 * is measured and given to the map as its bottom padding, as the order's map does.
 */
const mapStyles = (theme: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: themeColor(theme, 'background') },
  fill: { flex: 1 },
  container: { ...StyleSheet.absoluteFill },
  // The count of orders, a floating pill at the page side.
  count: {
    position: 'absolute',
    top: themeSpace(theme, 'lg'),
    left: themeGutter(theme),
    justifyContent: 'center',
    minHeight: themeControlHeight(theme, 'md'),
    paddingVertical: 0,
    paddingHorizontal: themeSpace(theme, 'md'),
    borderRadius: themeRadius(theme, 'full', { fixed: true }),
    ...nativeShadowStyle(theme.native.components.map_marker.base.shadow),
  },
  // The floating buttons, one over the other at the page side.
  fabs: {
    position: 'absolute',
    top: themeSpace(theme, 'lg'),
    right: themeGutter(theme),
    gap: themeSpace(theme, 'sm'),
  },
  // The card of the marker tapped, `sm` from the map's sides (the boards' 10), over the map's end.
  cardRoom: {
    position: 'absolute',
    left: themeSpace(theme, 'sm'),
    right: themeSpace(theme, 'sm'),
    bottom: themeSpace(theme, 'sm'),
  },
});

const MapViewComponent = (props: MapViewParams) => {
  const {
    isLoadingBusinessMarkers,
    markerGroups: allMarkerGroups,
    customerMarkerGroups,
    alertState,
    setAlertState,
    setDriverLocation,
    onNavigationRedirect,
    getBusinessLocations,
    isDeliveryApp
  } = props;

  const theme: any = useTheme();
  const styles = useMemo(() => mapStyles(theme), [theme]);
  const [, t] = useLanguage();
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const mapRef = useRef<MapView | any>(null);
  const following = useRef<boolean>(true);
  const [isFocused, setIsFocused] = useState(false)
  const [locationSelected, setLocationSelected] = useState<any>(null)
  // The marker whose card is open, and the card's measured height.
  const [selectedKey, setSelectedKey] = useState<MarkerKey | null>(null)
  const [cardHeight, setCardHeight] = useState(0)
  // The width of the buttons' column: the map frames its markers clear of it.
  const [controlsWidth, setControlsWidth] = useState(0)
  const {
    initialPosition,
    userLocation,
    stopFollowUserLocation,
    followUserLocation
  } = useLocation();
  // A store's disc is where to pick up: the orders already picked up are left out of its group (they are at their customer's).
  const markerGroups = useMemo(() => pickupGroups(allMarkerGroups), [allMarkerGroups])
  const haveOrders = Object.values(markerGroups)?.length > 0 && Object.values(customerMarkerGroups)?.length > 0

  const { region, setRegion, zoomIn, zoomOut } = useMapZoom(mapRef, {
    latitudeDelta: haveOrders ? 0.01 : 0.1,
    longitudeDelta: haveOrders ? 0.01 * ASPECT_RATIO : 0.1 * ASPECT_RATIO,
  })

  const location = useMemo(() => {
    return { lat: userLocation?.latitude, lng: userLocation?.longitude }
  }, [userLocation?.latitude, userLocation?.longitude])

  // The card follows its marker's data (the orders change under it); a marker that is gone closes it.
  const selectedGroup: any[] | undefined = selectedKey
    ? (selectedKey.customer ? (customerMarkerGroups as any) : markerGroups)?.[selectedKey.id as any]
    : undefined
  const selection = useMemo(
    () => selectedKey && selectedGroup?.length
      ? { marker: selectedGroup[0], customer: selectedKey.customer, orderIds: selectedGroup.map((order: any) => order.id) }
      : null,
    [selectedKey, selectedGroup]
  )
  // The orders on the map, not its discs: every order is in one store's group (the controller's, whole), counted once.
  const orderCount = useMemo(
    () => new Set(Object.values(allMarkerGroups ?? {}).flat().map((order: any) => order?.id)).size,
    [allMarkerGroups]
  )
  // The map keeps its marks above the card and the room it sits in, and the buttons' column (on the page gutter,
  // with `sm` more) to itself: where it fits the markers, none is drawn under a card or a button.
  const controlsRoom = controlsWidth > 0 ? themeGutter(theme) + controlsWidth + themeSpace(theme, 'sm') : 0
  const mapPadding = useMemo(
    () => ({ top: 0, right: controlsRoom, left: 0, bottom: selection && cardHeight > 0 ? themeSpace(theme, 'sm') + cardHeight : 0 }),
    [selection, cardHeight, controlsRoom, theme]
  )

  const closeCard = () => {
    setSelectedKey(null)
    setLocationSelected(null)
  }

  const openSelection = () => {
    if (!selection) return
    if (selection.orderIds.length > 1) onNavigationRedirect('Orders')
    else onNavigationRedirect('OrderDetails', { order: selection.marker })
  }

  /** Brings the map back to the driver, at the zoom it has. */
  const centerOnMe = () => {
    if (!mapRef.current || !location.lat || !location.lng) return
    following.current = true
    mapRef.current.animateToRegion({
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: region.current.latitudeDelta,
      longitudeDelta: region.current.longitudeDelta,
    })
  }

  const closeAlert = () => {
    setAlertState({
      open: false,
      content: [],
    });
  };

  const fitCoordinates = (location?: any) => {
    if (mapRef.current) {
      const isSendCoordinates =
        location &&
        userLocation &&
        location.latitude !== userLocation.latitude &&
        location.longitude !== userLocation.longitude &&
        location.latitude !== 0 &&
        location.longitude !== 0 &&
        userLocation.latitude !== 0 &&
        userLocation.longitude !== 0

      isSendCoordinates && mapRef.current.fitToCoordinates(
        [location, userLocation].map(_location => ({
          latitude: _location.latitude,
          longitude: _location.longitude
        })),
        {
          edgePadding: { top: 120, right: 120, bottom: 120, left: 120 }
        },
      );
    }
  };

  useEffect(() => {
    fitCoordinates(locationSelected || userLocation);
  }, [userLocation, locationSelected]);

  useEffect(() => {
    setRegion({ ...region.current, ...initialPosition })
  }, [initialPosition])

  useEffect(() => {
    if (isFocused) {
      getBusinessLocations()
    }
  }, [isFocused])

  useEffect(() => {
    followUserLocation();

    return () => {
      stopFollowUserLocation();
    };
  }, [isFocused]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true)
      return () => {
        stopFollowUserLocation()
        setIsFocused(false)
        setLocationSelected(null)
        setSelectedKey(null)
      }
    }, [])
  )

  useEffect(() => {
    if (userLocation?.latitude !== 0 && userLocation?.longitude !== 0) {
      const location = {
        lat: userLocation?.latitude,
        lng: userLocation?.longitude
      }
      setDriverLocation({ location })
    }
  }, [userLocation])

  /** The marker whose card is open (its group's id is the key the tap told). */
  const isSelected = (customer: boolean, id: number | string) =>
    !!selectedKey && selectedKey.customer === customer && String(selectedKey.id) === String(id)

  const renderMarkerDefaultProps = {
    initialPosition: initialPosition,
    setLocationSelected: setLocationSelected,
    onSelect: setSelectedKey
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.fill}>
        {(isDeliveryApp || (!isLoadingBusinessMarkers && isFocused)) && !!initialPosition?.latitude && !!initialPosition?.longitude && (
          <View style={styles.container}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: initialPosition?.latitude,
                longitude: initialPosition?.longitude,
                latitudeDelta: haveOrders ? 0.01 : 0.1,
                longitudeDelta: haveOrders ? 0.01 * ASPECT_RATIO : 0.1 * ASPECT_RATIO,
              }}
              style={StyleSheet.absoluteFill}
              // The map's own marks (Google's logo) stay above the marker's card.
              mapPadding={mapPadding}
              zoomTapEnabled
              zoomEnabled
              // The library's own zoom buttons (Android): the driver app draws its own.
              zoomControlEnabled={!isDeliveryApp}
              // A tap on a marker does not move the map (the library's default would center on the marker, the driver's own included):
              // the Map tab frames the stop it opens a card for itself, and the driver's disc takes no tap.
              moveOnMarkerPress={false}
              onTouchStart={() => (following.current = false)}
              onRegionChangeComplete={setRegion}
            >
              <>
                {Object.values(markerGroups).map((marker: any) => (
                  <RenderMarker
                    {...renderMarkerDefaultProps}
                    key={marker[0]?.business_id}
                    marker={marker[0]}
                    selected={isSelected(false, marker[0]?.business_id)}
                  />
                ))}
                {Object.values(customerMarkerGroups).map((marker: any) => (
                  <RenderMarker
                    {...renderMarkerDefaultProps}
                    key={marker[0]?.customer_id}
                    marker={marker[0]}
                    selected={isSelected(true, marker[0]?.customer_id)}
                    customer
                  />
                ))}
                <MapMarker
                  party='me'
                  latitude={typeof location.lat === 'number' && !Number.isNaN(location.lat) ? location.lat : 0}
                  longitude={typeof location.lng === 'number' && !Number.isNaN(location.lng) ? location.lng : 0}
                  label={t('YOUR_LOCATION', 'Your Location')}
                />
              </>
            </MapView>
            {!isLoadingBusinessMarkers && (
              <OCard style={styles.count} testID='map-count'>
                <OText preset='label'>
                  {(orderCount === 1
                    ? t('ORDERS_ON_THE_MAP_ONE', ':count: order on the map')
                    : t('ORDERS_ON_THE_MAP', ':count: orders on the map')).replace(':count:', String(orderCount))}
                </OText>
              </OCard>
            )}
            <View
              style={styles.fabs}
              pointerEvents='box-none'
              testID='map-controls'
              onLayout={(event) => setControlsWidth(Math.round(event.nativeEvent.layout.width))}
            >
              <MapZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />
              <OFab
                iconName='locate'
                onPress={centerOnMe}
                accessibilityLabel={t('CENTER_ON_MY_POSITION', 'Center on my position')}
              />
            </View>
            {!!selection && (
              <View
                style={styles.cardRoom}
                pointerEvents='box-none'
                testID='map-card-room'
                onLayout={(event) => setCardHeight(Math.round(event.nativeEvent.layout.height))}
              >
                <MarkerCard selection={selection} onClose={closeCard} onOpen={openSelection} />
              </View>
            )}
          </View>
        )}
      </View>
      <View>
        <Alert
          open={alertState.open}
          notice
          onAccept={closeAlert}
          onClose={closeAlert}
          content={alertState.content}
          title={t('ERROR', 'Error')}
        />
      </View>
    </SafeAreaView >
  );
};

export const MapViewUI = (props: any) => {
  const MapViewProps = {
    ...props,
    UIComponent: MapViewComponent
  }
  return <MapViewController {...MapViewProps} />
}
