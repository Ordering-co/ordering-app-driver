import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  View,
  Keyboard
} from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewCustomerParams } from '../../types'
import { reviewCommentList } from '../../utils'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { bottomBarClearance } from '@/theme/helpers'
import { usePageSections } from '@/theme/sections'

import { reviewStyles } from './styles'
import { withDividers } from '../OrderDetails/sections'

import { useLanguage, useUtils, ReviewCustomer as ReviewCustomerController } from '@components'
import {
  OAlertOriginal as Alert,
  OText,
  OTextarea,
  OAvatar,
  FilterChip,
  SectionTitle,
  KeyboardScreen,
  ONavbar,
} from '../shared'
import { FloatingButton } from '../FloatingButton'

/** The blocks of the page `review` inside the scroll; `send` is the bar under it. */
const FORM_SECTIONS = ['customer', 'rating', 'quick_comments', 'comment']
/** The scale follows the customer's block without a line: they read as one. */
const separates = (previous: string, next: string) => !(previous === 'customer' && next === 'rating')

/**
 * The review a driver leaves of a customer: the page `review` (the customer,
 * the 1 to 5 scale of five segments, the quick comments, the free comment and the Send bar), in
 * the theme's order. Its bar says whose order it is, under the title.
 */
const ReviewCustomerUI = (props: ReviewCustomerParams) => {
  const {
    order,
    closeModal,
    reviewState,
    setReviewState,
    actionState,
    handleSendCustomerReview,
    handleCustomCustomerReview
  } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ optimizeImage }] = useUtils()
  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [] })
  const insets = useSafeAreaInsets()
  const { render } = usePageSections('review')
  const { orderNumberLabel } = useSecureOrderId()
  const [comments, setComments] = useState<Array<any>>([])
  const [extraComment, setExtraComment] = useState('')
  const scrollref = useRef<any>(null)

  const form = theme.native.components.review_form
  // The form's titles: its own text look and color (`review_form.base`).
  const titleLook = form.base.title
  const titleColor = form.base.title_color
  const styles = useMemo(
    () => reviewStyles(theme, insets.top, bottomBarClearance(theme, insets.bottom)),
    [theme, insets.top, insets.bottom]
  )

  const qualificationList = [
    { key: 1, text: t('TERRIBLE', 'Terrible') },
    { key: 2, text: t('BAD', 'Bad') },
    { key: 3, text: t('OKAY', 'Okay') },
    { key: 4, text: t('GOOD', 'Good') },
    { key: 5, text: t('GREAT', 'Great') }
  ]

  const commentsList = reviewCommentList('customer', t)

  const handleChangeQualification = (index: any) => {
    if (index) setReviewState({ ...reviewState, qualification: index, comment: '' })
    setComments([])
  }

  const isSelectedComment = (commentKey: number) => {
    const found = comments.find((comment: any) => comment?.key === commentKey)
    return found
  }

  const handleChangeComment = (commentItem: any) => {
    const found = comments.find((comment: any) => comment?.key === commentItem.key)
    if (found) {
      const _comments = comments.filter((comment: any) => comment?.key !== commentItem.key)
      setComments(_comments)
    } else {
      setComments([...comments, commentItem])
    }
  }

  useEffect(() => {
    let _comments = ''
    if (comments.length > 0) {
      comments.map((comment: any) => (_comments += comment.content + '. '))
    }
    const _comment = _comments + extraComment
    setReviewState({ ...reviewState, comment: _comment })
  }, [comments, extraComment])

  useEffect(() => {
    if (!actionState.error) return
    setAlertState({
      open: true,
      content: actionState.error
    })

  }, [actionState.error])

  useEffect(() => {
    if (!scrollref?.current) return
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      scrollref?.current?.scrollToEnd && scrollref.current.scrollToEnd()
    })
    return () => subscription?.remove?.()
  }, [scrollref?.current])

  const customerName = `${order?.customer?.name ?? ''} ${order?.customer?.middle_name ?? ''} ${order?.customer?.lastname ?? ''} ${order?.customer?.second_lastname ?? ''}`?.replace('  ', ' ')?.trim() ?? ''

  const handleReviewClick = () => {
    handleCustomCustomerReview
      ? handleCustomCustomerReview({
        qualification: reviewState?.qualification,
        comment: reviewState?.comment
      })
      : handleSendCustomerReview()
  }

  // The segments up to the chosen level are filled.
  const qualification = Number(reviewState?.qualification) || 0

  // The customer's photo; a customer without one is the avatar's quiet disc with a person glyph (not its brand fill).
  const photo = order?.customer?.photo
  const customerPicture = (
    <OAvatar
      size='lg'
      source={photo ? optimizeImage(photo, 'h_100,c_limit') : null}
      tone={photo ? 'brand' : 'neutral'}
      testID='customer-avatar'
    />
  )

  const renderCustomer = () => (
    <View style={styles.customer}>
      {customerPicture}
      <View style={styles.customerText}>
        <SectionTitle text={titleLook} color={titleColor}>
          {t('RATE_THE_EXPERIENCE', 'Rate the experience')}
        </SectionTitle>
        {/* The lead under the block's title. */}
        {Boolean(customerName) && <OText preset='body_lg'>{t('HOW_WAS_YOUR_EXPERIENCE_WITH', 'How was your experience with')} {customerName}?</OText>}
      </View>
    </View>
  )

  const renderRating = () => (
    <View style={styles.scale}>
      {qualificationList.map((level) => (
        <Pressable
          key={level.key}
          accessibilityRole='button'
          accessibilityLabel={level.text}
          accessibilityState={{ selected: qualification === level.key }}
          onPress={() => handleChangeQualification(level.key)}
          style={({ pressed }) => [styles.level, pressed && styles.pressed]}
        >
          <View style={[styles.segment, level.key <= qualification && styles.segmentFilled]} testID={`rating-segment-${level.key}`} />
          <OText style={[styles.label, qualification === level.key && styles.labelActive]} weight={qualification === level.key ? 600 : undefined} numberOfLines={1}>
            {level.text}
          </OText>
        </Pressable>
      ))}
    </View>
  )

  const quickComments = commentsList[reviewState?.qualification || 1]?.list?.map((commentItem: any) => (
    <FilterChip
      key={commentItem.key}
      text={commentItem.content}
      size={form.slots.chip.size}
      selected={!!isSelectedComment(commentItem.key)}
      onPress={() => handleChangeComment(commentItem)}
    />
  ))

  const renderQuickComments = () => (
    <View>
      <SectionTitle text={titleLook} color={titleColor}>
        {/* A translation served by the project may still start with a space (the catalog's no longer does): the heading starts where the others do. */}
        {commentsList[reviewState?.qualification || 1]?.title?.trim()}
      </SectionTitle>
      {/* All of them are in sight: they wrap over several lines. */}
      <View style={styles.chips} testID='quick-comments'>{quickComments}</View>
    </View>
  )

  const renderComment = () => (
    <View>
      <SectionTitle text={titleLook} color={titleColor}>
        {t('REVIEW_COMMENT_QUESTION', 'Do you want to add something?')}
      </SectionTitle>
      <OTextarea
        placeholder={t('COMMENTS', 'Comments')}
        onChange={setExtraComment}
      />
    </View>
  )

  // The review is always a modal page (`OModal`), which is never inside the tabs: the Send bar keeps the system's bottom inset.
  const renderSend = () => (
    <View>
      <FloatingButton
        firstButtonClick={() => handleReviewClick()}
        btnText={actionState.loading ? t('LOADING', 'Loading') : t('SEND_REVIEW', 'Send Review')}
        isPadding
      />
    </View>
  )

  return (
    <KeyboardScreen
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.page}
    >
      <ONavbar
        title={t('REVIEW_CUSTOMER', 'Review customer')}
        subtitle={order?.id ? orderNumberLabel(order) : undefined}
        onBack={() => closeModal()}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ref={scrollref}
      >
        {withDividers(
          render({
            customer: renderCustomer,
            rating: renderRating,
            quick_comments: renderQuickComments,
            comment: renderComment
          }, { group: FORM_SECTIONS }),
          'band',
          { separates }
        )}
      </ScrollView>

      {render({ send: renderSend }, { group: ['send'] })}
      <Alert
        open={alertState.open}
        notice
        onAccept={() => setAlertState({ open: false, content: [] })}
        onClose={() => setAlertState({ open: false, content: [] })}
        content={alertState.content}
        title={t('ERROR', 'Error')}
      />
    </KeyboardScreen>
  )
}

export const ReviewCustomer = (props: any) => {
  const reviewCustomerProps = {
    ...props,
    UIComponent: ReviewCustomerUI
  }
  return <ReviewCustomerController {...reviewCustomerProps} />
}
