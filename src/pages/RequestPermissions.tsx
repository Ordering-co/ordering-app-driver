import React, { useContext, useEffect } from 'react';
import { Platform, ScrollView } from 'react-native';
import { useTheme } from 'styled-components/native';
import styled from 'styled-components/native';
import { openSettings } from 'react-native-permissions';
import { PermissionsContext } from '../context/PermissionsContext';
import settings from '../config.json'

import {
  NotFoundSource,
  FloatingButton
} from '@ui';
import { useLanguage } from '@components';

const RequestPermissions = ({ navigation }: any) => {
  const theme = useTheme();
  const [, t] = useLanguage();
  const { isGrantedPermissions } = useContext(PermissionsContext);
  const KeyboardView = styled.KeyboardAvoidingView`
    flex-grow: 1;
    backgroundColor: ${(props: any) => props.theme.colors.backgroundPage};
    padding: ${Platform.OS === 'ios' ? '30px' : '0 30px 30px'};
    display: flex;
    alignItems: center;
    justifyContent: center;
  `;

  const contentKey = Platform.OS === 'ios'
    ? 'DRIVER_PERMISSIONS_ERROR_IOS'
    : 'DRIVER_PERMISSIONS_ERROR'

  const contentText = Platform.OS === 'ios'
    ? 'You must grant the background location permission for the use of this app, please grant permission and restart the app.'
    : `This app require access to your device location (real time location provided by Google) and physical activity, those are needed to allow the customers to track your current location as a driver while working on his order, the physical activity is to optimize the battery to only track you while you’re moving in your route.\n
    This track will be used on background and the shared location will be finished for the customer once the order is delivered to him.\n
    Features used in background: Google maps real time GPS tracking.`

  const handleOpenSettings = () => {
    openSettings().catch(() => console.warn('cannot open settings'));
  };

  useEffect(() => {
    if(isGrantedPermissions){
      navigation.goBack()
    }
  }, [isGrantedPermissions])

  return (
    <>
      <KeyboardView
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {Platform.OS === 'ios' ? (
          <NotFoundSource
            content={t(contentKey, contentText)}
            conditioned={false}
            textSize={14}
            errorImage
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            <NotFoundSource
              content={t(contentKey, contentText)}
              conditioned={false}
              textSize={14}
              errorImage
            />
          </ScrollView>
        )}
      </KeyboardView>
      <FloatingButton
        btnText={t('GO_TO_SETTINGS', 'Go to settings')}
        isSecondaryBtn={false}
        firstButtonClick={handleOpenSettings}
        firstColorCustom={theme.colors.red}
        widthButton={'100%'}
        isPadding
        paddingBottomIos={20}
      />
    </>
  );
};

export default RequestPermissions;
