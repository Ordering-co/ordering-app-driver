import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';

import { OrderListItemSkeleton } from './OrderListItemSkeleton';

type OrderListSkeletonProps = {
  count?: number;
  showTimer?: boolean;
};

export const OrderListSkeleton = ({
  count = 5,
  showTimer = false,
}: OrderListSkeletonProps) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: theme.colors.backgroundPage,
      paddingTop: 2,
    },
  });

  return (
    <View style={styles.container} testID="order-list-skeleton">
      {Array.from({ length: count }, (_, index) => (
        <OrderListItemSkeleton
          key={`order-skeleton-${index}`}
          index={index}
          showTimer={showTimer}
        />
      ))}
    </View>
  );
};
