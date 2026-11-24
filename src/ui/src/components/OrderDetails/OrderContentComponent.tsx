import React, { useState, useCallback, useMemo } from 'react'
import { View, ScrollView } from 'react-native';
import { useTheme } from 'styled-components/native';

import { contentStyles } from './styles';
import { withDividers } from './sections';
import { CollapsibleTitle } from './CollapsibleTitle';

import { OrderBill } from './OrderBill';
import { orderCommentText } from './orderData';
import { OrderVehicle, hasSpotOrVehicle, orderCustomFields } from './OrderVehicle';
import { ProductLines } from './ProductLines';
import { ReviewCustomerModal, canReviewCustomer } from './reviewCustomer';
import {
  businessContacts, customerContacts, customerFullName, deliveryOptionName, distanceText, mapsUrl, storeToCustomerKilometers
} from './partyContact';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { usePhoneCountry } from '../../hooks/usePhoneCountry';
import { usePageSections } from '@/theme/sections';

import {
  useLanguage,
  useConfig,
  useApi
} from '@components';

import { DeviceOrientationMethods } from '../../hooks/DeviceOrientation'
import {
  Icon,
  OButton,
  OCard,
  OText,
  OLink,
  SectionTitle,
} from '../shared'

const { useDeviceOrientation } = DeviceOrientationMethods

interface OrderContent {
  order: any,
  logisticOrderStatus?: Array<number>,
  isOrderGroup?: boolean
}

/** The sections of the page `order_details` this component draws, after the header. */
const CONTENT_SECTIONS = ['custom_fields', 'business', 'customer', 'products', 'bill', 'vehicle', 'review']
/** The sections drawn as a card: two cards in a row need no line between them. */
const CARD_SECTIONS = ['custom_fields', 'business', 'customer']
const separates = (previous: string, next: string) => !(CARD_SECTIONS.includes(previous) && CARD_SECTIONS.includes(next))

/**
 * One order's details: the sections of the page `order_details` after its
 * header (custom fields, business, customer, products, bill, vehicle and the
 * review button), in the theme's order and with the page's divider
 * (`order_details.divider`) between them. Each section is a child of the
 * scroll that hosts them; the orders of a group come each in its own card.
 */
export const OrderContentComponent = (props: OrderContent) => {
  const [, t] = useLanguage();
  const defaultCountry = usePhoneCountry()
  const theme: any = useTheme()
  const [ordering] = useApi()
  const { order, logisticOrderStatus, isOrderGroup } = props;
  const [{ configs }] = useConfig();
  const [orientationState] = useDeviceOrientation();
  const { orderNumberLabel } = useSecureOrderId();
  const { render } = usePageSections('order_details')
  const distanceUnit = configs?.distance_unit?.value

  const WIDTH_SCREEN = orientationState?.dimensions?.width

  const [openReviewModal, setOpenReviewModal] = useState(false)
  const [showFields, setShowFields] = useState({ customFields: false, businessFields: false, customerFields: false });
  const [isReadMore, setIsReadMore] = useState({
    customerAddress: false,
    businessAddressNotes: false
  })
  const [lengthMore, setLengthMore] = useState({
    customerAddress: false,
    businessAddressNotes: false
  })

  const details = theme.native.components.order_details
  const styles = useMemo(() => contentStyles(theme), [theme])

  const onTextLayout = useCallback((e: any, item: string) => {
    if (item === 'customerAddress') {
      const customerAddressMore = (e.nativeEvent.lines.length == 2 && e.nativeEvent.lines[1].width > WIDTH_SCREEN * .76) || e.nativeEvent.lines.length > 2
      setLengthMore(prev => ({ ...prev, customerAddress: customerAddressMore }))
    }
    if (item === 'businessAddressNotes') {
      const businessAddressNotesMore = (e.nativeEvent.lines.length == 3 && e.nativeEvent.lines[2].width > WIDTH_SCREEN * .76) || e.nativeEvent.lines.length > 3
      setLengthMore(prev => ({ ...prev, businessAddressNotes: businessAddressNotesMore }))
    }
  }, []);



  const renderCustomFields = () => orderCustomFields(order).length > 0 ? (
    <OCard style={styles.card}>
      <CollapsibleTitle
        title={t('CUSTOM_FIELDS', 'Custom fields')}
        expanded={showFields.customFields}
        onPress={() => setShowFields((prev) => ({ ...prev, customFields: !prev.customFields }))}
      />
      {showFields.customFields && (
        <View style={styles.body}>
          {orderCustomFields(order).map((field: any) => (
            <View key={field.id} style={styles.field}>
              <OText preset='label' style={styles.fieldKey}>
                {field.key}
              </OText>
              <OText style={styles.fieldValue}>
                {field.value}
              </OText>
            </View>
          ))}
        </View>
      )}
    </OCard>
  ) : null

  const renderBusiness = () => {
    const contacts = businessContacts(theme, order, logisticOrderStatus, defaultCountry)
    const storeToCustomer = storeToCustomerKilometers(order)
    return (
      <OCard style={styles.card}>
        <CollapsibleTitle
          title={t('BUSINESS_DETAILS', 'Business details')}
          expanded={showFields.businessFields}
          onPress={() => setShowFields((prev) => ({ ...prev, businessFields: !prev.businessFields }))}
        />
        {showFields.businessFields && (
          <View style={styles.body}>
            <OText preset='label' numberOfLines={1} ellipsizeMode="tail">
              {order?.business?.name}
            </OText>
            {!!contacts.email && (
              <OLink
                url={contacts.email.url}
                shorcut={contacts.email.text}
              />
            )}

            {contacts.phones.map((phone) => (
              <OLink
                key={phone.key}
                url={phone.url}
                shorcut={phone.text}
              />
            ))}

            {!!order?.business?.address && (
              <OLink
                url={mapsUrl(order?.business?.address, order?.business?.location)}
                numberOfLines={2}
                shorcut={order?.business?.address}
              />
            )}
            {storeToCustomer !== null && (
              <OText preset='label'>
                {t('DISTANCE_TO_THE_BUSINESS', 'Distance to the business')}: {distanceText(storeToCustomer, distanceUnit, t)}
              </OText>
            )}
            {!!order?.business?.address_notes && (
              <>
                <OLink
                  url={mapsUrl(order?.business?.address_notes, order?.business?.location)}
                  shorcut={order?.business?.address_notes}
                  onTextLayout={e => onTextLayout(e, 'businessAddressNotes')}
                  numberOfLines={isReadMore.businessAddressNotes ? 20 : 3}
                />
                {lengthMore.businessAddressNotes && (
                  <OLink
                    PressStyle={styles.more}
                    shorcut={isReadMore.businessAddressNotes ? t('SHOW_LESS', 'Show less') : t('READ_MORE', 'Read more')}
                    onPress={() => setIsReadMore({ ...isReadMore, businessAddressNotes: !isReadMore.businessAddressNotes })}
                  />
                )}
              </>
            )}
          </View>
        )}
      </OCard>
    )
  }

  const renderCustomer = () => {
    const contacts = customerContacts(theme, order, defaultCountry)
    const deliveryOption = deliveryOptionName(order, t)
    return (
      <OCard style={styles.card}>
        <CollapsibleTitle
          title={t('CUSTOMER_DETAILS', 'Customer details')}
          expanded={showFields.customerFields}
          onPress={() => setShowFields((prev) => ({ ...prev, customerFields: !prev.customerFields }))}
        />
        {showFields.customerFields && (
          <View style={styles.body}>
            {(!!order?.customer?.name || !!order?.customer?.lastname) && (
              <View style={styles.nameRow}>
                {(order?.customer?.name || order?.customer?.middle_name || order?.customer?.lastname || order?.customer?.second_lastname) && (
                  <OText preset='label' numberOfLines={2} ellipsizeMode="tail" style={styles.name}>
                    {customerFullName(order)}
                  </OText>
                )}
                {!!order?.user_review?.qualification && (
                  <View style={styles.rating}>
                    <Icon name='star' color='text_muted' />
                    <OText style={styles.info}>
                      {order?.user_review?.qualification}
                    </OText>
                  </View>
                )}
              </View>
            )}

            {!!contacts.email && (
              <OLink
                url={contacts.email.url}
                shorcut={contacts.email.text}
              />
            )}

            {contacts.phones.map((phone) => (
              <OLink
                key={phone.key}
                url={phone.url}
                shorcut={phone.text}
              />
            ))}

            {!!order?.customer?.address && (
              <>
                <OLink
                  url={mapsUrl(order?.customer?.address, order?.customer?.location)}
                  onTextLayout={e => onTextLayout(e, 'customerAddress')}
                  numberOfLines={isReadMore.customerAddress ? 20 : 2}
                  shorcut={order?.customer?.address}
                />
                {lengthMore.customerAddress && (
                  <OLink
                    PressStyle={styles.more}
                    shorcut={isReadMore.customerAddress ? t('SHOW_LESS', 'Show less') : t('READ_MORE', 'Read more')}
                    onPress={() => setIsReadMore({ ...isReadMore, customerAddress: !isReadMore.customerAddress })}
                  />
                )}
              </>
            )}

            {!!order?.customer?.internal_number && (
              <OText style={styles.info} numberOfLines={1} ellipsizeMode="tail">
                {order?.customer?.internal_number}
              </OText>
            )}

            {!!order?.customer?.address_notes && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                horizontal
              >
                <OText style={styles.info} numberOfLines={1} ellipsizeMode="tail">
                  {order?.customer?.address_notes}
                </OText>
              </ScrollView>
            )}

            {!!order?.customer?.zipcode && (
              <OText style={styles.info} numberOfLines={1} ellipsizeMode="tail">
                {order?.customer?.zipcode}
              </OText>
            )}

            {!!order?.on_behalf_of && (
              <OText style={styles.info} numberOfLines={1} ellipsizeMode="tail">
                {t('ON_BEHALF_OF', 'On behalf of')}{': '} {order?.on_behalf_of}
              </OText>
            )}
            {!!deliveryOption && (
              <OText style={styles.info}>
                {deliveryOption}
              </OText>
            )}
          </View>
        )}
      </OCard>
    )
  }

  const comment = orderCommentText(order)

  const renderProducts = () => (
    <View style={styles.products}>
      <SectionTitle text={details.base.address_title}>
        {t('ORDER_DETAILS', 'Order Details')}
      </SectionTitle>

      {!!comment && (
        <>
          <OText style={styles.info}>
            {`${t('ORDER_COMMENT', 'Order comment')}: `}
          </OText>
          {/* A project's own emphasis of the comment (behaviour, kept). */}
          {ordering?.project?.includes('delosi')
            ? <OText preset='label' color='primary_text'>{comment}</OText>
            : <OText style={styles.info}>{comment}</OText>}
        </>
      )}

      <ProductLines order={order} />
    </View>
  )

  const renderBill = () => <OrderBill order={order} />

  const renderVehicle = () => hasSpotOrVehicle(order) ? <OrderVehicle order={order} /> : null

  const renderReview = () => canReviewCustomer(order) ? (
    <OButton
      color={details.slots.review.color}
      appearance={details.slots.review.appearance}
      size={details.slots.review.size}
      text={t('REVIEW_CUSTOMER', 'Review customer')}
      onClick={() => setOpenReviewModal(true)}
    />
  ) : null

  const sections = withDividers(
    render({
      custom_fields: renderCustomFields,
      business: renderBusiness,
      customer: renderCustomer,
      products: renderProducts,
      bill: renderBill,
      vehicle: renderVehicle,
      review: renderReview
    }, { group: CONTENT_SECTIONS }),
    details.base.divider,
    // Alone, the sections follow the page's header; in a group, their order's title.
    { separates, first: isOrderGroup ? undefined : 'header' }
  )

  const reviewModal = (
    <ReviewCustomerModal order={order} open={openReviewModal} onClose={() => setOpenReviewModal(false)} />
  )

  if (isOrderGroup) {
    return (
      <OCard style={styles.group}>
        <SectionTitle text={details.base.address_title}>{orderNumberLabel(order)}</SectionTitle>
        {sections}
        {reviewModal}
      </OCard>
    )
  }

  return (
    <>
      {sections}
      {reviewModal}
    </>
  )
}
