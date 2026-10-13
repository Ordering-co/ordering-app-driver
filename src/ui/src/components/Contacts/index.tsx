import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from 'styled-components/native';
import { ContactParams } from '../../types';
import { Card, Logo, Information, Header, Badge, Stars } from './styles';

import {
  Contacts as ContactsController,
  useLanguage,
  useUtils,
} from '@components';

import { NotFoundSource, OIcon, OText, OButton, OrderListSkeleton } from '@ui';

const ContactsUI = (props: ContactParams) => {
  const {
    contacts: { data, loading, error },
    activeTag,
    pagination,
    getBusinesses,
    getCustomers,
    getDrivers,
    loadMore,
    onNavigationRedirect,
  } = props;

  const [, t] = useLanguage();
  const theme = useTheme();
  const [{ parseDate, optimizeImage }] = useUtils();

  const handlePressOrder = (order: any) => {
    const uuid = order?.id;
    onNavigationRedirect &&
      onNavigationRedirect('OrderMessage', { orderId: uuid });
  };

  useEffect(() => {
    if (!loading) {
      switch (activeTag) {
        case 2:
          getBusinesses && getBusinesses();
          break;
        case 3:
          getCustomers && getCustomers();
          break;
        case 4:
          getDrivers && getDrivers();
          break;
      }
    }
  }, [activeTag]);

  const styles = StyleSheet.create({
    btnCard: {
      flex: 1,
      minHeight: 64,
      marginBottom: 30,
    },
    icon: {
      borderRadius: 7.6,
      width: 73,
      height: 73,
    },
    name: {
      fontFamily: 'Poppins',
      fontStyle: 'normal',
      fontWeight: '600',
      fontSize: 18,
      color: theme.colors.textGray,
    },
    badge: {
      fontFamily: 'Poppins',
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontSize: 14,
      color: theme.colors.primary,
    },
    star: {
      fontFamily: 'Poppins',
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontSize: 15,
      color: theme.colors.unselectText,
    },
    order: {
      fontFamily: 'Poppins',
      fontStyle: 'normal',
      fontWeight: 'normal',
      color: theme.colors.orderTypeColor,
    },
    btn: {
      borderRadius: 7.6,
      height: 44,
      marginBottom: 40,
      marginTop: 5,
    },
    btnText: {
      color: theme.colors.white,
      fontFamily: 'Poppins',
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontSize: 18,
    },
  });

  return (
    <>
      <ScrollView style={{ height: '80%' }}>
        {data?.length > 0 &&
          data?.map((contact: any) => (
            <TouchableOpacity
              key={contact?.id}
              // onPress={() => handlePressOrder(contact)}
              onPress={() => {}}
              style={styles.btnCard}
              activeOpacity={1}>
              <Card key={contact?.id}>
                <Logo>
                  <OIcon
                    url={optimizeImage(
                      contact?.logo || contact?.photo,
                      'h_300,c_limit',
                    )}
                    style={styles.icon}
                  />
                </Logo>

                <Information>
                  <Header>
                    <OText numberOfLines={1} style={styles.name}>
                      {contact?.name + ' ' + (contact?.lastname ?? '')}
                    </OText>

                    {contact?.unread_count > 0 && (
                      <Badge>
                        <OText size={14} style={styles.badge}>
                          {contact?.unread_count}
                        </OText>
                      </Badge>
                    )}
                  </Header>

                  <Stars>
                    {[
                      ...Array(
                        Number.isInteger(contact?.qualification)
                          ? contact?.qualification ?? 3
                          : Math.floor(contact?.qualification) || 3,
                      ),
                    ].map((item, index) => (
                      <MaterialIcon
                        key={index}
                        name="star"
                        size={20}
                        color={theme.colors.arrowColor}
                      />
                    ))}

                    {[
                      ...Array(
                        (Number.isInteger(contact?.qualification)
                          ? contact?.qualification ?? 3
                          : Math.ceil(contact?.qualification) || 3) -
                          (Number.isInteger(contact?.qualification)
                            ? contact?.qualification ?? 3
                            : Math.floor(contact?.qualification) || 3),
                      ),
                    ].map((item, index) => (
                      <MaterialIcon
                        key={index}
                        name="star-half"
                        size={20}
                        color={theme.colors.arrowColor}
                      />
                    ))}

                    {[
                      ...Array(
                        5 -
                          (Number.isInteger(contact?.qualification)
                            ? contact?.qualification ?? 3
                            : Math.ceil(contact?.qualification) || 3),
                      ),
                    ].map((item, index) => (
                      <MaterialIcon
                        key={index}
                        name="star-border"
                        size={20}
                        color={theme.colors.arrowColor}
                      />
                    ))}
                  </Stars>

                  <OText style={styles.order} numberOfLines={1} size={16}>
                    {contact?.level === 4
                      ? contact?.assigned_orders_count
                      : contact?.level === 3
                      ? contact?.assigned_orders_count || ''
                      : ''}{' '}
                    {t('ORDERS', 'Orders')}
                  </OText>
                </Information>
              </Card>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {!loading && data?.length === 0 && (
        <NotFoundSource
          content={t('NO_RESULTS_FOUND', 'Sorry, no results found')}
          image={theme.images.general.notFound}
          conditioned={false}
        />
      )}

      {loading && <OrderListSkeleton count={5} />}

      {!loading && pagination?.currentPage < pagination?.totalPages && (
        <OButton
          onClick={() => loadMore && loadMore(activeTag)}
          text={t('LOAD_MORE', 'Load more')}
          imgRightSrc={null}
          textStyle={styles.btnText}
          style={styles.btn}
          bgColor={theme.colors.primary}
          borderColor={theme.colors.primary}
        />
      )}
    </>
  );
};

export const Contacts = (props: ContactParams) => {
  const contactProps = {
    ...props,
    firstFetch: 'businesses',
    paginationSettings: {
      page: 1,
      pageSize: 6,
      controlType: 'infinity',
    },
    orderBy: 'name',
    orderDirection: 'asc',
    UIComponent: ContactsUI,
  };

  return <ContactsController {...contactProps} />;
};
