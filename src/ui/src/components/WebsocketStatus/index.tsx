import React, { useState } from 'react'
import { TouchableOpacity, View, StyleSheet, Platform, Dimensions } from 'react-native'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native'
import RNRestart from 'react-native-restart'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Container,
  ModalContainer,
  ModalTitle,
  StatusItemWrapper,
  StatusText
} from './styles'

import { useLanguage, useUtils, WebsocketStatus as WebsocketStatusController } from '@components'
import { OModal, OButton, OText, OIcon } from '../shared'

const { width } = Dimensions.get('window')

const SocketStatusUI = (props: any) => {
  const {
    socketStatus,
    connectedDate
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ parseDate }] = useUtils()
  const [openModal, setOpenModal] = useState(false)
  const { top, bottom } = useSafeAreaInsets()

  const styles = StyleSheet.create({
    statusText: {
      color: theme.colors.unselectText,
      fontSize: 14,
      fontWeight: '400',
      maxWidth: '100%',
    }
  })
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return theme.colors.warning100;
      case 1:
        return '#E3FEF3';
      case 2:
        return theme.colors.danger100;
      default:
        return '#FFF1E0';
    }
  }

  const getStatusTextColor = (status: number) => {
    switch (status) {
      case 0:
        return '#FF9922';
      case 1:
        return '#00D27A';
      case 2:
        return '#E63757';
      default:
        return '#FF9922';
    }
  }

  return (
    <Container>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: getStatusColor(socketStatus),
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 15,
          width: 100
        }}
        activeOpacity={0.6}
        onPress={() => setOpenModal(true)}
      >
        <OText
          style={{ color: getStatusTextColor(socketStatus), fontSize: 16, marginBottom: 0, lineHeight: 16 }}
        >
          {t('CONNECTION_STATUS_SHORT', 'Status')}
        </OText>
      </TouchableOpacity>

      <OModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        customClose
        isTransparent
      >
        <ModalContainer style={{
          width: width - 40,
          padding: 20,
          marginTop: top,
          marginBottom: bottom
        }}>
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <ModalTitle>{t('CONNECTION_STATUS', 'Connection status')}</ModalTitle>
                <OText style={{ marginBottom: 20, fontWeight: '400' }}>
                  {t('LAST_UPDATE', 'Last update')}: {parseDate(connectedDate)}
                </OText>
              </View>
              <TouchableOpacity onPress={() => setOpenModal(false)}>
                <MaterialIcon name='close' size={28} color={theme.colors.gray200} />
              </TouchableOpacity>
            </View>
            <StatusItemWrapper style={{ backgroundColor: theme.colors.success100 }}>
              <MaterialIcon
                name='circle'
                size={12}
                color={getStatusTextColor(1)}
                style={{ marginHorizontal: 8 }}
              />
              <View style={{ marginLeft: 16, marginRight: 16 }}>
                <StatusText>{t('OK', 'Ok')}</StatusText>
                <OText style={styles.statusText} numberOfLines={1} adjustsFontSizeToFit={true}>{t('WEBSOCKET_OK', 'The websocket works normally.')}</OText>
              </View>
            </StatusItemWrapper>
            <StatusItemWrapper style={{ backgroundColor: theme.colors.warning100 }}>
              <MaterialIcon
                name='circle'
                size={12}
                color={getStatusTextColor(0)}
                style={{ marginHorizontal: 8 }}
              />
              <View style={{ marginLeft: 16, marginRight: 16 }}>
                <StatusText>{t('CONNECTING', 'Connecting')}</StatusText>
                <OText style={styles.statusText} numberOfLines={1} adjustsFontSizeToFit={true}>{t('WEBSOCKET_CONNECTING', 'The websocket is connecting.')}</OText>
              </View>
            </StatusItemWrapper>
            <StatusItemWrapper style={{ backgroundColor: theme.colors.danger100 }}>
              <MaterialIcon
                name='circle'
                size={12}
                color={getStatusTextColor(2)}
                style={{ marginHorizontal: 8 }}
              />
              <View style={{ marginLeft: 16, marginRight: 16 }}>
                <StatusText>{t('DISCONNECTED', 'Disconnected')}</StatusText>
                <OText style={styles.statusText} adjustsFontSizeToFit numberOfLines={1}>{t('WEBSOCKET_DISCONNECTED', 'The server is slow, please reload.')}</OText>
              </View>
            </StatusItemWrapper>

            <View style={{ flexDirection: 'row', marginTop: 50 }}>
              <OButton
                onClick={() => RNRestart.restart()}
                borderColor={theme.colors.primary}
                textStyle={{ color: theme.colors.white }}
                style={{ borderRadius: 8, height: 50, width: '100%' }}
                text={t('UPDATE', 'Update')}
              />
            </View>
          </View>
        </ModalContainer>
      </OModal>
    </Container>
  )
}

export const WebsocketStatus = (props: any) => {
  const socketProps = {
    ...props,
    UIComponent: SocketStatusUI
  }
  return <WebsocketStatusController {...socketProps} />
}
