import React, { useState, useEffect, createContext } from 'react';
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

export interface PermissionsState {
  locationStatus: PermissionStatus;
}

export const permissionInitState: PermissionsState = {
  locationStatus: 'unavailable',
};

type PermissionsContextProps = {
  permissions: PermissionsState;
  isGrantedPermissions: Boolean;
  askLocationPermission: () => void;
  checkLocationPermission: () => void;
  redirectToSettings: () => void;
  getPermissions: () => [];
};

export const PermissionsContext = createContext({} as PermissionsContextProps);

export const PermissionsProvider = ({ children }: any) => {
  const [permissions, setPermissions] = useState(permissionInitState);
  const AndroidVersion: any = Platform.OS === 'android' && DeviceInfo.getSystemVersion()
  const isAndroid10 = AndroidVersion === 10
  const isAndroid11OorNewer = AndroidVersion >= 11
  const isIos = Platform.OS === 'ios';

  const getPermissions = () => {
    const permissions: any = []
    if (isIos) {
      permissions.push(PERMISSIONS.IOS.LOCATION_ALWAYS)
      permissions.push(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE)
    } else {
      if (isAndroid11OorNewer) {
        permissions.push(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION)
        permissions.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
        permissions.push(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION)
      } else if (isAndroid10){
        permissions.push(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION)
        permissions.push(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION)
        permissions.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
        permissions.push(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION)
      }
      else {
        permissions.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
      }
    }
    return permissions
  }

  useEffect(() => {
    checkLocationPermission();

    AppState.addEventListener('change', state => {
      if (state !== 'active') return;

      checkLocationPermission();
    });
  }, []);

  const askLocationPermission = async () => {
    let permissionStatus: any;
    permissionStatus = await requestMultiple(getPermissions())
    setPermissions({
      ...permissions,
      locationStatus: permissionStatus,
    });

    return permissionStatus;
  };

  const checkLocationPermission = async () => {
    let permissionStatus: any;
    permissionStatus = await checkMultiple(getPermissions());
    setPermissions({
      ...permissions,
      locationStatus: permissionStatus,
    });
  };

  const redirectToSettings = () => {
    openSettings();
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        askLocationPermission,
        checkLocationPermission,
        redirectToSettings,
        getPermissions,
        isGrantedPermissions: areAllPermissionResultsGranted(permissions.locationStatus, RESULTS.GRANTED)
      }}>
      {children}
    </PermissionsContext.Provider>
  );
};
