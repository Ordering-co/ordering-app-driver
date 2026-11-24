import React, { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import { Platform, AppState } from 'react-native';
import DeviceInfo from "react-native-device-info";
import {
  checkMultiple,
  PERMISSIONS,
  PermissionStatus,
  requestMultiple,
  openSettings,
  RESULTS
} from 'react-native-permissions';
import { areAllPermissionResultsGranted } from './areAllPermissionResultsGranted';
import { canTrackLocation } from './canTrackLocation';

export interface PermissionsState {
  locationStatus: PermissionStatus;
}

export const permissionInitState: PermissionsState = {
  locationStatus: 'unavailable',
};

type PermissionsContextProps = {
  permissions: PermissionsState;
  isGrantedPermissions: Boolean;
  /** The system lets the app read the position (iOS "While Using" or "Always"; Android the foreground permission): what the driver's tracking needs. */
  canTrackLocation: Boolean;
  askLocationPermission: () => void;
  checkLocationPermission: () => void;
  redirectToSettings: () => void;
  getPermissions: () => [];
};

export const PermissionsContext = createContext({} as PermissionsContextProps);

export const PermissionsProvider = ({ children }: any) => {
  const [permissions, setPermissions] = useState(permissionInitState);

  // The permissions this device asks for: they depend on the platform only, so the function is the same for the provider's life.
  const getPermissions = useCallback(() => {
    const AndroidVersion: any = Platform.OS === 'android' && DeviceInfo.getSystemVersion()
    const isAndroid10 = AndroidVersion === 10
    const isAndroid11OorNewer = AndroidVersion >= 11
    const isIos = Platform.OS === 'ios';
    const permissions: any = []
    if (isIos) {
      permissions.push(PERMISSIONS.IOS.LOCATION_ALWAYS)
      permissions.push(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE)
    } else {
      if (isAndroid11OorNewer) {
        permissions.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
        permissions.push(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION)
      } else if (isAndroid10){
        permissions.push(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION)
        permissions.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
        permissions.push(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION)
      }
      else {
        permissions.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
      }
    }
    return permissions
  }, [])

  // What the system says, kept as the context's state: a result equal to the one held changes nothing (no render),
  // so a re-check that finds the same answer is free. The functions below are stable for the provider's life: a screen
  // can re-check from an effect without chasing a new function.
  const keepStatus = useCallback((locationStatus: any) => {
    setPermissions((previous) => {
      const same = JSON.stringify(previous.locationStatus) === JSON.stringify(locationStatus)
      return same ? previous : { ...previous, locationStatus }
    })
  }, [])

  const askLocationPermission = useCallback(async () => {
    const permissionStatus: any = await requestMultiple(getPermissions())
    keepStatus(permissionStatus)

    return permissionStatus;
  }, [getPermissions, keepStatus])

  // Asks the system what the app has now. A permission the driver took away while the app ran is gone from
  // here as soon as this runs: the app does it when it comes back to the foreground and when the Map tab opens.
  // A check that fails changes nothing (the last answer stays).
  const checkLocationPermission = useCallback(async () => {
    try {
      keepStatus(await checkMultiple(getPermissions()))
    } catch {}
  }, [getPermissions, keepStatus])

  useEffect(() => {
    checkLocationPermission();

    // Coming back from the settings (or from the shade, or a call) is when a permission changes under the app.
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;

      checkLocationPermission();
    });
    return () => subscription?.remove?.()
  }, [checkLocationPermission]);

  const redirectToSettings = () => {
    openSettings();
  };

  const value = useMemo(() => ({
    permissions,
    askLocationPermission,
    checkLocationPermission,
    redirectToSettings,
    getPermissions,
    isGrantedPermissions: areAllPermissionResultsGranted(permissions.locationStatus, RESULTS.GRANTED),
    canTrackLocation: canTrackLocation(permissions.locationStatus, Platform.OS)
  }), [permissions, askLocationPermission, checkLocationPermission, getPermissions])

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};
