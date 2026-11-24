import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';
import { themePart, themeSpace } from '@/theme/helpers';

import { OrderListItemSkeleton } from './OrderListItemSkeleton';
import { SkeletonBone } from './SkeletonBone';
import { ROUTE_ENTRY_SIZE } from '../OrdersRoute/routeEntryLook';

type OrderListSkeletonProps = {
  count?: number;
  showTimer?: boolean;
  showPosition?: boolean;
  /** The Assigned tab: its cards have no position yet and draw the setter chip (`OrderListItemSkeleton`). */
  showSetter?: boolean;
  /** A tab of orders that are over: cards with no stop line and no buttons (`OrderListItemSkeleton`). */
  closed?: boolean;
  logistic?: boolean;
  /**
   * The In Progress tab while the theme shows the route (`orders.route`) and no search is applied: the list starts with the route's entry
   * button (`OrdersRouteEntry`), so the skeleton starts with a bone as tall as it, the card's gap under it as the list's. It cannot know
   * whether the entry will be there: a list that arrives empty, or with no order that has a stop with a location, has no button.
   */
  routeEntry?: boolean;
};

/** The orders list while it loads: `count` placeholder cards, `md` apart as the real ones (the list's gap). */
export const OrderListSkeleton = ({
  count = 5,
  showTimer = false,
  showPosition = false,
  showSetter = false,
  closed = false,
  logistic = false,
  routeEntry = false,
}: OrderListSkeletonProps) => {
  const theme: any = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { width: '100%', gap: themeSpace(theme, 'md') },
  }), [theme]);

  return (
    <View style={styles.container} testID="order-list-skeleton">
      {routeEntry && (
        <SkeletonBone
          width='100%'
          height={themePart(theme, 'button', `sizes.${ROUTE_ENTRY_SIZE}.height`)}
          borderRadius={themePart(theme, 'button', 'base.radius')}
          testID='order-list-skeleton-route'
        />
      )}
      {Array.from({ length: count }, (_, index) => (
        <OrderListItemSkeleton
          key={`order-skeleton-${index}`}
          index={index}
          showTimer={showTimer}
          showPosition={showPosition}
          showSetter={showSetter}
          closed={closed}
          logistic={logistic}
        />
      ))}
    </View>
  );
};
