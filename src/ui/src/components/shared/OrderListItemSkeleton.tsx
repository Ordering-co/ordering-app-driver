import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';

import { SkeletonBone } from './SkeletonBone';

type OrderListItemSkeletonProps = {
  index?: number;
  showTimer?: boolean;
};

export const OrderListItemSkeleton = ({
  index = 0,
  showTimer = false,
}: OrderListItemSkeletonProps) => {
  const theme = useTheme();
  const stagger = index * 60;

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      minHeight: 97,
      paddingVertical: 6,
      marginBottom: 12,
    },
    avatar: {
      marginRight: 12,
    },
    content: {
      flex: 1,
      minHeight: 75,
      justifyContent: 'flex-start',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    titleGroup: {
      flex: 1,
      marginRight: 12,
    },
    metaLine: {
      marginBottom: 8,
    },
    statusPill: {
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.borderTops,
      marginTop: 4,
    },
  });

  return (
    <View>
      <View style={styles.row}>
        <SkeletonBone
          width={75}
          height={75}
          borderRadius={10}
          delay={stagger}
          style={styles.avatar}
        />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <SkeletonBone width="72%" height={16} borderRadius={6} delay={stagger + 30} />
            </View>
            <SkeletonBone width={22} height={22} borderRadius={11} delay={stagger + 45} />
          </View>
          <SkeletonBone
            width="58%"
            height={12}
            borderRadius={5}
            delay={stagger + 60}
            style={styles.metaLine}
          />
          {showTimer && (
            <SkeletonBone
              width="34%"
              height={12}
              borderRadius={5}
              delay={stagger + 75}
              style={styles.metaLine}
            />
          )}
          <SkeletonBone
            width={88}
            height={24}
            borderRadius={5}
            delay={stagger + 90}
            style={styles.statusPill}
          />
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  );
};
