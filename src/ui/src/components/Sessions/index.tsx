import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'styled-components/native'

import { SessionsParams } from '../../types'
import { nativeTextStyle, themeGutter, themePart, themeSpace } from '@/theme/helpers'

import { useLanguage, useSession, useUtils, Sessions as SessionsController } from '@components'
import {
  Icon,
  OAlertOriginal as OAlert,
  OBadge,
  OButton,
  OCard,
  ONavbar,
  OText,
  SkeletonBone,
} from '../shared'
import { NotFoundSource } from '../NotFoundSource'
import { FloatingButton } from '../FloatingButton'

/** The cards the skeleton stands for. */
const SKELETON_CARDS = [0, 1, 2, 3, 4]

/**
 * An account page (`account_page`: its room below, over the system's bottom
 * inset; the room above is the header's `xs`). A session is a card: its dates in the card's title and
 * metadata looks (`order_card`). Without sessions, or with the sessions turned
 * off, it is the app's empty state (`NotFoundSource`).
 */
const sessionsStyles = (theme: any, bottomInset: number) => {
  const page = themePart(theme, 'account_page', 'base')
  const card = themePart(theme, 'order_card', 'base')
  const row = themePart(theme, 'list_row', 'base')
  return StyleSheet.create({
    page: { flex: 1 },
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: page.padding_bottom + bottomInset,
      gap: themeSpace(theme, 'md'),
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    dates: { flex: 1, gap: themeSpace(theme, 'xs'), alignItems: 'flex-start' },
    meta: { ...nativeTextStyle(card.meta), color: card.meta_color },
    // The dates are plain text, as a list row's title is (not the card title's semibold): "Started" and its date.
    title: { ...nativeTextStyle(row.title), color: row.title_color },
    // A caption is the title's look in the metadata's color ("Started" before its date).
    caption: { ...nativeTextStyle(row.title), color: card.meta_color },
    bones: { flex: 1, gap: themeSpace(theme, 'sm') },
  })
}

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
  const theme: any = useTheme()
  const insets = useSafeAreaInsets()
  const hasSessions = user?.session_strategy === 'jwt_session' && !sessionsList.loading && sessionsList.sessions.length > 0
  // The bottom bar keeps the system's inset itself; without it the scroll does.
  const styles = useMemo(() => sessionsStyles(theme, hasSessions ? 0 : insets.bottom), [theme, insets.bottom, hasSessions])
  const [confirm, setConfirm] = useState<any>({ open: false, content: null, handleOnAccept: null, id: null, title: null, acceptText: undefined, destructive: false })
  const goToBack = () => navigation?.canGoBack() && navigation.goBack()

  const onDeleteSession = (session: any) => {
    setConfirm({
      open: true,
      title: t('WEB_APPNAME', 'Ordering'),
      content: [t('QUESTION_DELETE_SESSION', 'Are you sure to delete this session?')],
      // The accept button is named after what it does, and a deletion is the system's destructive button.
      acceptText: t('DELETE', 'Delete'),
      destructive: true,
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
      acceptText: isOldUser ? t('ACTIVE_SESSIONS', 'Active sessions') : t('DELETE', 'Delete'),
      destructive: !isOldUser,
      handleOnAccept: () => {
        handleDeleteAllSessions(deleteCurrent)
        setConfirm({ ...confirm, open: false })
      }
    })
  }

  // The skeleton's bone for the delete button: the button's own box.
  const buttonSize = themePart(theme, 'button', 'sizes.md.height')

  return (
    <View style={styles.page}>
      <ONavbar title={t('SESSIONS', 'Sessions')} onBack={() => goToBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {user?.session_strategy === 'jwt_session' ? (
          <>
            {sessionsList.loading ? (
              SKELETON_CARDS.map(i => (
                <OCard key={i} testID='session-skeleton'>
                  <View style={styles.row}>
                    <View style={styles.bones}>
                      <SkeletonBone width='40%' />
                      <SkeletonBone width='40%' />
                    </View>
                    <SkeletonBone width={buttonSize} height={buttonSize} />
                  </View>
                </OCard>
              ))
            ) : (
              sessionsList.sessions.length > 0 ? (
                <>
                  {[...sessionsList.sessions].reverse().map((session: any) => (
                    <OCard key={session.id} testID='session-card'>
                      <View style={styles.row}>
                        <View style={styles.dates}>
                          {session.current && (
                            <OBadge variant='success'>{t('CURRENT', 'Current')}</OBadge>
                          )}
                          <OText style={styles.title}>
                            <OText style={styles.caption}>{t('STARTED', 'Started')}</OText>
                            {' '}{parseDate(session.created_at)}
                          </OText>
                          <OText style={styles.meta}>{`${t('VALID_UNTIL', 'Valid until')} ${parseDate(session.valid_thru)}`}</OText>
                        </View>
                        <OButton
                          iconOnly
                          color='neutral'
                          appearance='ghost'
                          testID={`session-delete-${session.id}`}
                          accessibilityLabel={t('DELETE', 'Delete')}
                          icon={<Icon name='close' />}
                          onClick={() => onDeleteSession(session)}
                        />
                      </View>
                    </OCard>
                  ))}
                </>
              ) : (
                <NotFoundSource content={t('YOU_DONT_HAVE_ANY_SESSIONS', 'You don\'t have any sessions')} />
              )
            )}
          </>
        ) : (
          <NotFoundSource
            content={t('YOU_DONT_HAVE_ENABLED_THE_SESSIONS', 'You don\'t have enabled the sessions, please active them to have a better control of your sessions.')}
            btnTitle={t('ACTIVE_SESSIONS', 'Active sessions')}
            btnDisabled={actionState.loading}
            onClickButton={() => onDeleteAllSessions(true, false)}
          />
        )}
      </ScrollView>
      {hasSessions && (
        // The bulk actions, in the app's bottom bar: both are negative; the one that leaves the current session
        // is solid over "delete all", which is the outline one (it also ends this session).
        <FloatingButton
          inline
          isPadding
          testID='sessions-bar'
          negative
          outline
          thirdBtnText={t('DELETE_ALL_SESSIONS_EXCEPT_CURRENT', 'Delete all sessions except current')}
          thirdButtonClick={() => onDeleteAllSessions(false, false)}
          btnText={t('DELETE_ALL_SESSIONS', 'Delete all sessions')}
          firstButtonClick={() => onDeleteAllSessions(false, true)}
          disabled={actionState.loading}
        />
      )}
      <OAlert
        open={confirm.open}
        title={confirm.title}
        content={confirm.content}
        onAccept={confirm.handleOnAccept}
        acceptText={confirm.acceptText}
        destructive={confirm.destructive}
        onCancel={() => setConfirm({ ...confirm, open: false, title: null })}
        onClose={() => setConfirm({ ...confirm, open: false, title: null })}
      />
    </View>
  )
}

export const Sessions = (props: SessionsParams) => {
  const sessionsProps = {
    ...props,
    UIComponent: SessionsUI
  }
  return <SessionsController {...sessionsProps} />
}
