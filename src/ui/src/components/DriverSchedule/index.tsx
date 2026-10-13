import React, { useEffect, useState } from 'react'
import { Platform, RefreshControl, ScrollView, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DayContainer } from './styles'
import { useLanguage, useSession, useUtils } from '@components'
import { ONavbar, OText } from '../shared'
import moment from 'moment'

export const DriverSchedule = (props: any) => {
  const { schedule, setOpenModal } = props
  const [, t] = useLanguage()
  const theme = useTheme()
  const [, { refreshUserInfo }] = useSession()
  const [{ parseDate }] = useUtils()
  const insets = useSafeAreaInsets()
  const [refreshing] = useState(false);
  const [driverSchedule, setDriverSchedule] = useState([]);

  const daysOfWeek = [
    t('SUNDAY_ABBREVIATION', 'Sun'),
    t('MONDAY_ABBREVIATION', 'Mon'),
    t('TUESDAY_ABBREVIATION', 'Tues'),
    t('WEDNESDAY_ABBREVIATION', 'Wed'),
    t('THURSDAY_ABBREVIATION', 'Thur'),
    t('FRIDAY_ABBREVIATION', 'Fri'),
    t('SATURDAY_ABBREVIATION', 'Sat')
  ]

  const getNextDate = (day: any) => {
    const now = new Date()
    now.setDate(now.getDate() + (day + (7 - now.getDay())) % 7)
    return now
  }

  const scheduleFormatted = ({ hour, minute }: any) => {
    const checkTime = (val: number) => val < 10 ? `0${val}` : val
    return `${checkTime(hour)}:${checkTime(minute)}`
  }

  useEffect(() => {
    if (schedule) {
      setDriverSchedule(schedule)
    } else {
      const _schedule: any = []
      for (let i = 0; i < 7; i++) {
        _schedule.push({
          enabled: true,
          lapses: [
            {
              open: {
                hour: 0,
                minute: 0
              },
              close: {
                hour: 23,
                minute: 59
              }
            }
          ]
        })
      }
      setDriverSchedule(_schedule)
    }
  }, [schedule])

  return (
    <ScrollView
      refreshControl={<RefreshControl
        refreshing={refreshing}
        onRefresh={() => refreshUserInfo()}
      />}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? insets.top : 15 }}>
        <ONavbar title={t('SCHEDULE', 'Schedule')} onBack={() => setOpenModal(false)} />
      </View>
      <View style={{ borderRadius: 10, marginHorizontal: 20, padding: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary }}>
        <OText size={20} color={theme.colors.primary} weight={700}>{moment().format('dddd, MMMM D, YYYY')}</OText>
      </View>
      <View style={{ marginHorizontal: 20, marginTop: 10 }}>
        {driverSchedule.map((item: any, i: number) => (
          <DayContainer key={daysOfWeek[i]}>
            <View style={{ flex: 1 }}>
              <OText size={22} weight={700}>{daysOfWeek[i]}</OText>
              <OText size={14}>{parseDate(getNextDate(i), { outputFormat: 'YYYY-MM-DD' })}</OText>
            </View>
            <View style={{ flex: 1 }}>
              <>
                {item?.enabled ? (
                  <View style={{ width: '100%' }}>
                    {item?.lapses.map((lapse: any, i: number) => (
                      <View key={`${daysOfWeek[i]}_${i}`} style={{ marginTop: 3, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <OText size={18} style={{ flex: 1 }}>
                          {scheduleFormatted(lapse.open)}
                        </OText>
                        <OText size={18} style={{ width: 15 }}>
                          -
                        </OText>
                        <OText size={18} style={{ flex: 1, textAlign: 'right' }}>
                          {scheduleFormatted(lapse.close)}
                        </OText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <OText size={18} style={{ marginTop: 3, marginBottom: 10 }} color={theme.colors.red}>{t('NOT_AVAILABLE', 'Not available')}</OText>
                )}
              </>
            </View>
          </DayContainer>
        ))}
      </View>
    </ScrollView>
  )
}
