import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { ODivider } from './ODivider';
import { SkeletonBone } from './SkeletonBone';
import { messageListStyles } from '../PreviousMessages/styles';
import { themeControlHeight, themeMotion, themePart, themeRadius, themeText } from '@/theme/helpers';

type MessageListSkeletonProps = {
  count?: number;
};

/**
 * The Messages list while it loads: `count` placeholder rows, laid out with the list's own styles
 * (`messageListStyles`: the row, its lines) with the app's line between rows, and the row's own
 * pieces: the store's logo, the name, the number and date line, the status badge and the timer at
 * the row's end, each as tall as the piece it stands for, so a row has the size and the pitch of a
 * real one. The count of unread messages is not drawn: a row without any would not have it.
 */
export const MessageListSkeleton = ({ count = 5 }: MessageListSkeletonProps) => {
  const theme: any = useTheme();
  const styles = useMemo(() => messageListStyles(theme), [theme]);
  const logo = themePart(theme, 'avatar', 'sizes.md.size');
  const badge = themePart(theme, 'badge', 'sizes.sm.height');
  const badgeRadius = themePart(theme, 'badge', 'base.radius');
  const name = themeText(theme, 'label').lineHeight as number;
  const meta = themeText(theme, 'body_sm').lineHeight as number;
  const step = themeMotion(theme, 'fast').duration / 4;
  // The bones' own widths: a placeholder's room, from the size scale.
  const statusWidth = themeControlHeight(theme, 'xl');
  const timerWidth = themeControlHeight(theme, 'md');

  return (
    <View testID='message-list-skeleton'>
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ODivider />}
          <View style={styles.row} testID='message-row-skeleton'>
            <SkeletonBone width={logo} height={logo} borderRadius={themeRadius(theme, 'sm')} delay={index * step * 2} />
            <View style={styles.info}>
              <SkeletonBone width='60%' height={name} delay={index * step * 2 + step} />
              <SkeletonBone width='64%' height={meta} delay={index * step * 2 + step * 2} />
              <View style={styles.badges}>
                <SkeletonBone width={statusWidth} height={badge} borderRadius={badgeRadius} delay={index * step * 2 + step * 3} />
              </View>
            </View>
            <View style={styles.aside}>
              <SkeletonBone width={timerWidth} height={meta} delay={index * step * 2 + step * 3} />
            </View>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
};
