import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { SkeletonBone } from './SkeletonBone';

type ChatBubbleSkeletonProps = {
  variant: 'left' | 'right';
  width: number | `${number}%`;
  lines?: 1 | 2;
  delay?: number;
};

const ChatBubbleSkeleton = ({
  variant,
  width,
  lines = 1,
  delay = 0,
}: ChatBubbleSkeletonProps) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.75)).current;
  const isLeft = variant === 'left';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [delay, opacity]);

  const bubbleStyle = {
    alignSelf: isLeft ? ('flex-start' as const) : ('flex-end' as const),
    maxWidth: '78%' as const,
    width,
    minHeight: lines === 2 ? 52 : 38,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
    backgroundColor: isLeft ? theme.colors.inputDisabled : theme.colors.secondary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: isLeft ? 0 : 30,
    borderBottomRightRadius: isLeft ? 30 : 0,
    justifyContent: 'center' as const,
    gap: 6,
  };

  const lineWidth = isLeft ? ('85%' as const) : ('70%' as const);
  const secondLineWidth = isLeft ? ('55%' as const) : ('45%' as const);

  return (
    <View style={{ width: '100%' }}>
      <Animated.View style={[bubbleStyle, { opacity }]}>
        <SkeletonBone width={lineWidth} height={10} borderRadius={5} delay={delay} />
        {lines === 2 && (
          <SkeletonBone width={secondLineWidth} height={10} borderRadius={5} delay={delay + 20} />
        )}
      </Animated.View>
    </View>
  );
};

export const ChatMessageSkeleton = () => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.backgroundPage,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.borderTops,
      backgroundColor: theme.colors.white,
    },
    headerText: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0,
    },
    chatArea: {
      flex: 1,
      backgroundColor: theme.colors.white,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
      justifyContent: 'flex-end',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: theme.colors.white,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.borderTops,
    },
    composerField: {
      flex: 1,
      marginHorizontal: 10,
    },
  });

  return (
    <View style={styles.root} testID="chat-message-skeleton">
      <View style={styles.header}>
        <SkeletonBone width={36} height={36} borderRadius={8} delay={0} />
        <SkeletonBone width={40} height={40} borderRadius={20} delay={30} />
        <View style={styles.headerText}>
          <SkeletonBone width="68%" height={14} borderRadius={6} delay={45} />
          <SkeletonBone
            width="52%"
            height={11}
            borderRadius={5}
            delay={60}
            style={{ marginTop: 6 }}
          />
        </View>
      </View>

      <View style={styles.chatArea}>
        <ChatBubbleSkeleton variant="left" width="64%" delay={90} />
        <ChatBubbleSkeleton variant="right" width="46%" delay={150} />
        <ChatBubbleSkeleton variant="left" width="72%" lines={2} delay={210} />
        <ChatBubbleSkeleton variant="right" width="58%" delay={270} />
        <ChatBubbleSkeleton variant="left" width="40%" delay={330} />
      </View>

      <View style={styles.toolbar}>
        <SkeletonBone width={32} height={32} borderRadius={16} delay={390} />
        <View style={styles.composerField}>
          <SkeletonBone width="100%" height={40} borderRadius={15} delay={420} />
        </View>
        <SkeletonBone width={44} height={44} borderRadius={15} delay={450} />
      </View>
    </View>
  );
};
