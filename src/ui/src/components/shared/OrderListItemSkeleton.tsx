import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeTextStyle, themeControlHeight, themeIconSize, themeMotion, themePart, themeRadius, themeText, themeVisible } from '@/theme/helpers';

import { OCard } from './OCard';
import { SkeletonBone } from './SkeletonBone';
import { orderCardStyles } from '../PreviousOrders/styles';

type OrderListItemSkeletonProps = {
  index?: number;
  /** The time at the status band's end (the tabs of open orders on the enterprise plan, and the tabs of orders that are over: `orderCardPieces`). */
  showTimer?: boolean;
  /**
   * The delivery position, as the first piece of the chips' row (`orderCardPieces`). A card that has one draws "Delivery #N", a badge,
   * in place of the order's type; so the skeleton draws that badge's bone in place of the type's (the card's setter, a chip taller than
   * a badge, is drawn only while the order has no position yet, and the skeleton cannot know that).
   */
  showPosition?: boolean;
  /**
   * The tab of orders the driver has not accepted (Assigned): they have no delivery position yet, so the card draws the position's setter, a
   * chip taller than a badge, beside the type (`orderCardPieces`'s `setter`). Its row is as tall as that chip, which is what a skeleton
   * drawn with badge-tall bones got wrong by the chip's height less the badge's (12 on Android, where the list shifted when the cards came).
   */
  showSetter?: boolean;
  /**
   * A tab of orders that are over (completed, cancelled): its cards have no stop line and no quick actions (`orderCardPieces`'s
   * `closedTime`). Without it the card is an open order's: the stop line and, with `orders.quick_actions` on, one row of buttons.
   */
  closed?: boolean;
  /** An assign request: its card has the header and, under it, its buttons. */
  logistic?: boolean;
};

/**
 * The placeholder of an order card while the list loads: the card's own box
 * (`components.order_card`) laid out with the card's own styles (`orderCardStyles`: its band, its blocks, its
 * header, its gaps, the lines of its texts), with a bone for each piece the card draws: the status band's
 * status (and its time), the logo, the store's name over the title and the total at the header's end, the line
 * of the stop the driver goes to and the chips, each as tall as the piece it stands for, so the row has the size
 * of the real card. A piece the theme hides is not drawn; an assign request has the header and its buttons. The band is edge to edge, on
 * the neutral badge's tint (the card's band has the tone of the order's time, not known yet). The quick actions are one bone as tall as
 * a button, in the card's own footer (`OCard`, which keeps the card's gap above it), so a list of open orders keeps its height when the
 * cards replace it; the orders that are over have no stop line and no buttons, as their cards. The chips' row is two badge-tall bones
 * (the lead, the position's pill or the order's type, and the payment): the row of a card is as tall as its tallest chip, and the card's
 * pill and badges are the badge's own height, not the setter chip's (decided on 2026-11-23, after Android's list shifted 11 dp).
 */
export const OrderListItemSkeleton = ({
  index = 0,
  showTimer = false,
  showPosition = false,
  showSetter = false,
  closed = false,
  logistic = false,
}: OrderListItemSkeletonProps) => {
  const theme: any = useTheme();
  const card = themePart(theme, 'order_card', 'base');
  const styles = useMemo(() => orderCardStyles(theme), [theme]);
  const logo = themePart(theme, 'avatar', 'sizes.md.size');
  const badge = themePart(theme, 'badge', 'sizes.sm.height');
  const badgeSide = themePart(theme, 'badge', 'sizes.sm.padding_x');
  const badgeRadius = themePart(theme, 'badge', 'base.radius');
  // The setter chip (`FilterChip` `sm` with only a glyph): its height, its radius and its width, the glyph between its two paddings.
  const setter = themePart(theme, 'chip', 'sizes.sm');
  const setterRadius = themePart(theme, 'chip', 'base.radius');
  const setterWidth = themeIconSize(theme, 'sm') + 2 * setter.padding_x;
  const meta = nativeTextStyle(card.meta).lineHeight;
  const title = themeText(theme, 'body_lg').lineHeight;
  const figure = themeText(theme, 'h4').lineHeight;
  const bandLine = nativeTextStyle(card.time_text).lineHeight;
  const stopLine = themeText(theme, 'body_sm').lineHeight;
  // Each bone starts a moment after the one before it, and each row after the row before.
  const step = themeMotion(theme, 'fast').duration / 4;
  const stagger = index * step * 2;
  const showLogo = themeVisible(theme, 'orders.business_logo');
  const showName = themeVisible(theme, 'orders.business_name');
  const showStatus = !logistic && themeVisible(theme, 'orders.order_status');
  const showType = !logistic && themeVisible(theme, 'orders.order_type');
  // The total is the details' own switch, as on the card.
  const showTotal = !logistic && themeVisible(theme, 'confirmation.order.total');
  const showBand = !logistic && (showStatus || showTimer);
  const showStop = !logistic && !closed;
  const showActions = !closed && themeVisible(theme, 'orders.quick_actions');
  // The buttons' row of the card: as tall as its action (`order_card.slots.advance`: the decline has the same size), as wide as the card.
  const action = themePart(theme, 'order_card', 'slots.advance');
  const buttonHeight = themePart(theme, 'button', `sizes.${action.size}.height`);
  const buttonRadius = themePart(theme, 'button', 'base.radius');
  const bandTint = themePart(theme, 'badge', 'variants.neutral.background');

  return (
    <OCard
      look={card}
      footer={showActions ? <SkeletonBone width='100%' height={buttonHeight} borderRadius={buttonRadius} delay={stagger + step * 6} /> : undefined}
      testID='order-list-item-skeleton'
    >
      {showBand && (
        // The status band, edge to edge, with its status at the start and its time at the end (a neutral tint: the tone is not known yet).
        <View style={[styles.band, { backgroundColor: bandTint }]} testID='order-list-item-skeleton-band'>
          {showStatus && <SkeletonBone width='40%' height={bandLine} delay={stagger} />}
          {showTimer && <SkeletonBone width={themeControlHeight(theme, 'lg')} height={bandLine} delay={stagger + step} style={styles.bandTimeBone} />}
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.header}>
          {showLogo && (
            <SkeletonBone width={logo} height={logo} borderRadius={themeRadius(theme, 'sm')} delay={stagger} />
          )}
          <View style={styles.info}>
            {showName && <SkeletonBone width='40%' height={meta} delay={stagger + step} />}
            <SkeletonBone width='65%' height={title} delay={stagger + step * 2} />
          </View>
          {showTotal && (
            // The order's total at the header's end.
            <SkeletonBone width={themeControlHeight(theme, 'lg')} height={figure} delay={stagger + step} />
          )}
        </View>
        {showStop && (
          <SkeletonBone width='80%' height={stopLine} delay={stagger + step * 3} />
        )}
        {showType && (
          <View style={styles.chips}>
            {/* A card with no position yet leads with the setter chip, then the order's type. */}
            {showSetter && <SkeletonBone width={setterWidth} height={setter.height} borderRadius={setterRadius} delay={stagger + step * 5} />}
            {/* The card's lead, a badge either way: "Delivery #N" (a little wider than the type's word) or the order's type. */}
            <SkeletonBone
              width={themeControlHeight(theme, 'xl') + (showPosition && !showSetter ? 2 * badgeSide : 0)}
              height={badge}
              borderRadius={badgeRadius}
              delay={stagger + step * 5}
            />
            <SkeletonBone width={themeControlHeight(theme, 'xl')} height={badge} borderRadius={badgeRadius} delay={stagger + step * 5} />
          </View>
        )}
      </View>
    </OCard>
  );
};
