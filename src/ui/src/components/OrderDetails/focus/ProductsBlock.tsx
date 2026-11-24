import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { ProductLines } from '../ProductLines'
import { isAtStoreStatus } from '../orderStages'
import { orderCommentText } from '../orderData'
import { Icon, OText, ONotice } from '../../shared'

import { useLanguage } from '@components'

/**
 * The order's comment, always visible: it is what the driver must not miss at the store. A notice with a
 * speech-bubble glyph (the comment's, not the warning triangle the notice brings): the glyph is drawn here, with
 * the notice's own icon size and ink, in the row the notice's content is.
 */
export const CommentNotice = ({ order }: { order: any }) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const comment = orderCommentText(order)
  if (!comment) return null
  const alert = theme.native.components.alert
  return (
    <ONotice variant='warning' showIcon={false} testID='focus-comment'>
      <View style={styles.noticeRow}>
        <Icon name='chatbox-outline' size={alert.base.icon_size} color={alert.variants.warning.icon_color} testID='focus-comment-icon' />
        <View style={styles.noticeTexts}>
          <OText preset='body_sm'>{t('ORDER_COMMENT', 'Order comment')}</OText>
          <OText preset='label' testID='focus-comment-text'>{comment}</OText>
        </View>
      </View>
    </ONotice>
  )
}

/**
 * The products of an order (page section `products`), one folded row: how many of them and how many items,
 * with a line of what they are while folded. It starts open at the store, where the driver checks them against
 * the order, and folded elsewhere; once the driver opens or folds it, the row keeps that.
 */
export const ProductsBlock = ({ order, effectiveStatus }: { order: any, effectiveStatus: number }) => {
  const [, t] = useLanguage()
  const [chosen, setChosen] = useState<boolean | null>(null)
  const open = chosen ?? isAtStoreStatus(effectiveStatus)

  const products: any[] = order?.products ?? []
  const items = products.reduce((total, product) => total + (Number(product?.quantity) || 0), 0)
  // Each text is a call of its own, with its key and its English: the translation catalog is read from them.
  const productsText = products.length === 1
    ? t('ORDER_PRODUCTS_COUNT_ONE', ':count: product')
    : t('ORDER_PRODUCTS_COUNT', ':count: products')
  const itemsText = items === 1
    ? t('ORDER_ITEMS_COUNT_ONE', ':count: item')
    : t('ORDER_ITEMS_COUNT', ':count: items')
  const title = [productsText.replace(':count:', String(products.length)), itemsText.replace(':count:', String(items))].join(' · ')
  const summary = products.map((product) => `${product?.quantity} ${product?.name}`).join(', ')

  return (
    <FoldedRow
      open={open}
      onToggle={() => setChosen(!open)}
      label={title}
      header={(
        <>
          <OText preset='label'>{title}</OText>
          {!open && !!summary && <OText preset='body_sm' color='text_muted' numberOfLines={1}>{summary}</OText>}
        </>
      )}
      body={<ProductLines order={order} />}
      bodyFlush
      testID='focus-products'
    />
  )
}
