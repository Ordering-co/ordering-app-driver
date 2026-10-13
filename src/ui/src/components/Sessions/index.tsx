import React, { useState } from 'react'
import { View, TouchableOpacity, Platform, StyleSheet, Dimensions } from 'react-native'
import { Fade, Placeholder, PlaceholderLine } from 'rn-placeholder'
import AntIcon from 'react-native-vector-icons/AntDesign'
import { useTheme } from 'styled-components/native'

import { SessionsParams } from '../../types'

import {
  SessionsWrapper,
  SessionItem,
  DurationWrapper,
  Container
} from './styles'

import { useLanguage, useSession, useUtils, Sessions as SessionsController } from '@components'
import { OAlertOriginal as OAlert, OButton, OIcon, OIconButton, ONavbar, OText } from '@ui'

const { height: HEIGHT_SCREEN } = Dimensions.get('window')
export const SessionsUI = (props: SessionsParams) => {
  const {
    navigation,
    sessionsList,
    actionState,
    handleDeleteSession,
    handleDeleteAllSessions
  } = props

  const [, t] = useLanguage()
  const [{ user }] = useSession()
  const [{ parseDate }] = useUtils()
  const theme = useTheme()
  const [confirm, setConfirm] = useState<any>({ open: false, content: null, handleOnAccept: null, id: null, title: null })
  const goToBack = () => navigation?.canGoBack() && navigation.goBack()

  const onDeleteSession = (session: any) => {
    setConfirm({
      open: true,
      title: t('WEB_APPNAME', 'Ordering'),
      content: [t('QUESTION_DELETE_SESSION', 'Are you sure to delete this session?')],
      handleOnAccept: () => {
        handleDeleteSession(session)
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  const onDeleteAllSessions = (isOldUser: any, deleteCurrent: any) => {
    setConfirm({
      open: true,
      title: t('WEB_APPNAME', 'Ordering'),
      content:
        isOldUser
          ? [t('QUESTION_ENABLE_ALL_SESSIONS', 'Are you sure to enable all sessions?')]
          : deleteCurrent
            ? [t('QUESTION_DELETE_ALL_SESSIONS', 'Are you sure that you want to delete all sessions?')]
            : [t('QUESTION_DELETE_ALL_SESSIONS_EXCEPT_CURRENT', 'Are you sure that you want to delete all sessions except current?')],
      handleOnAccept: () => {
        handleDeleteAllSessions(deleteCurrent)
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  const styles = StyleSheet.create({
    titleGroups: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 33,
    },
    btnBackArrow: {
      borderWidth: 0,
      width: 32,
      height: 32,
      tintColor: theme.colors.textGray,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0,
      marginRight: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 24,
      fontFamily: theme.fonts.special.name,
      fontWeight: 'bold',
      color: theme.colors.textGray,
    },
  });

  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 0 : 15 }}>
        <ONavbar title={t('SESSIONS', 'Sessions')} onBack={() => goToBack()} />
      </View>
      {user?.session_strategy === 'jwt_session' ? (
        <>
          {sessionsList.loading ? (
            [...Array(5).keys()].map(i => (
              <SessionItem key={i}>
                <Placeholder Animation={Fade}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <PlaceholderLine width={40} />
                      <PlaceholderLine width={40} />
                    </View>
                    <PlaceholderLine width={5} />
                  </View>
                </Placeholder>
              </SessionItem>
            ))
          ) : (
            sessionsList.sessions.length > 0 ? (
              <View style={{ paddingHorizontal: 20 }}>
                <SessionsWrapper style={{ maxHeight: HEIGHT_SCREEN * 0.7 }} nestedScrollEnabled={true}>
                  {sessionsList.sessions.reverse().map((session: any) => (
                    <SessionItem key={session.id}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '80%' }}>
                        <DurationWrapper>
                          <OText color={theme.colors.unselectText}>{parseDate(session.created_at)}</OText>
                          <OText color={theme.colors.textGray}>{parseDate(session.valid_thru)}</OText>
                        </DurationWrapper>
                        {session.current && (
                          <OText color={theme.colors.success500}>{t('CURRENT', 'Current')}</OText>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => onDeleteSession(session)}
                        style={{
                          borderRadius: 10,
                          padding: 5,
                          borderWidth: 1,
                          borderColor: theme.colors.tabBar,
                        }}
                      >
                        <AntIcon name='close' size={16} color={theme.colors.gray200} />
                      </TouchableOpacity>
                    </SessionItem>
                  ))}
                </SessionsWrapper>
                <View style={{ bottom: 0, padding: 20, width: '100%', backgroundColor: theme.colors.white }}>
                  <OButton
                    text={t('DELETE_ALL_SESSIONS', 'Delete all sessions')}
                    isDisabled={actionState.loading}
                    textStyle={{ color: theme.colors.danger500, fontSize: 14, width: '100%', textAlign: 'center' }}
                    bgColor={theme.colors.white}
                    borderColor={theme.colors.danger500}
                    onClick={() => onDeleteAllSessions(false, true)}
                    style={{ borderRadius: 10, marginTop: 10 }}
                  />
                  <OButton
                    text={t('DELETE_ALL_SESSIONS_EXCEPT_CURRENT', 'Delete all sessions except current')}
                    isDisabled={actionState.loading}
                    bgColor={theme.colors.danger500}
                    borderColor={theme.colors.danger500}
                    textStyle={{ color: theme.colors.white, fontSize: 14, width: '100%', textAlign: 'center' }}
                    onClick={() => onDeleteAllSessions(false, false)}
                    style={{ borderRadius: 10, marginTop: 10 }}
                  />
                </View>
              </View>
            ) : (
              <OText>{t('YOU_DONT_HAVE_ANY_SESSIONS', 'You don\'t have any sessions')}</OText>
            )
          )}
        </>
      ) : (
        <View style={{ paddingHorizontal: 20 }}>
          <OText>
            {t('YOU_DONT_HAVE_ENABLED_THE_SESSIONS', 'You don\'t have enabled the sessions, please active them to have a better control of your sessions.')}
          </OText>
          <OButton
            text={t('ACTIVE_SESSIONS', 'Active sessions')}
            isDisabled={actionState.loading}
            textStyle={{ color: theme.colors.white, fontSize: 14 }}
            onClick={() => onDeleteAllSessions(true, false)}
            style={{ borderRadius: 7.6, marginTop: 20 }}
          />
        </View>
      )}
      <OAlert
        open={confirm.open}
        title={confirm.title}
        content={confirm.content}
        onAccept={confirm.handleOnAccept}
        onCancel={() => setConfirm({ ...confirm, open: false, title: null })}
        onClose={() => setConfirm({ ...confirm, open: false, title: null })}
      />
    </>
  )
}

export const Sessions = (props: SessionsParams) => {
  const sessionsProps = {
    ...props,
    UIComponent: SessionsUI
  }
  return <SessionsController {...sessionsProps} />
}
