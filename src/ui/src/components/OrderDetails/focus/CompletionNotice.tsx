import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { OText, ONotice } from '../../shared'
import { useDeliveryPin } from '../../../hooks/useDeliveryPin'
import { useStatusImage } from '../../../hooks/useStatusImage'

import { useLanguage } from '@components'

/** The status "Delivery complete" sets: the one whose photo the project may ask for. */
const DELIVERY_COMPLETE_STATUS = 11

/**
 * What "Delivery complete" will ask for, said before the driver taps it: the customer's delivery PIN and a
 * photo of the delivery, each only when the project requires it. Nothing when it requires neither.
 */
export const CompletionNotice = ({ order }: { order: any }) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const { requiresDeliveryPin } = useDeliveryPin()
  const { requiresImage } = useStatusImage()
  const styles = useMemo(() => focusStyles(theme), [theme])

  const needs = [
    requiresDeliveryPin(order) && t('COMPLETE_NEEDS_PIN', "The customer's delivery PIN"),
    requiresImage(DELIVERY_COMPLETE_STATUS) && t('COMPLETE_NEEDS_PHOTO', 'A photo of the delivery')
  ].filter(Boolean)
  if (needs.length === 0) return null

  return (
    <ONotice variant='info' testID='focus-completion'>
      <View style={styles.noticeTexts}>
        <OText preset='label'>{t('TO_COMPLETE_THE_DELIVERY', 'To complete the delivery')}</OText>
        <OText preset='body_sm'>{needs.join(' · ')}</OText>
      </View>
    </ONotice>
  )
}
