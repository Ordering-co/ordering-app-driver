import React, { useEffect, useMemo } from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import { useLanguage } from '@components';
import { StoreMethods, Icon, OButton, OText, Pager, PagerDots } from '@ui'
import { usePageSections } from '@/theme/sections';
import { nativeTextStyle, themeBottomSpace, themeColor, themeGutter, themeImage, themeSpace, themeVisible } from '@/theme/helpers';

const { _setStoreData } = StoreMethods

// The slide's image: the most of the window's height its box takes, and the
// proportions (height over width) the slides are drawn at.
const IMAGE_HEIGHT_SHARE = 0.6634645
const IMAGE_RATIO = 1369 / 1242

/**
 * The tutorial of the first launch: `components.tutorial` (title, dots and the
 * `action` slot of Next and Done, the `skip` slot of Skip) over the app's pager. Its slides are
 * the sections of the page `onboarding`, in the theme's order; a hidden slide
 * is not shown and, with none to show, the tutorial ends as when it is done.
 * `onboarding.skip` hides Skip. Next and Done are the `action` slot's look (a
 * solid primary button); Skip is the `skip` slot's (a ghost, the milder way out).
 */
const IntroductoryTutorial = ({ route }: any) => {
  const [, t] = useLanguage();
  const theme: any = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const setTutorial = route?.params?.setTutorial;
  const data = [
    {
      key: 'slide_1',
      title: t('MOBILE_NEW_ORDER', 'New Order'),
      text: t('NEW_ORDER_INST', 'Alerts will come whenever you have a new order to deliver.'),
      image: themeImage(theme, 'onboarding.slide_1'),
    },
    {
      key: 'slide_2',
      title: t('DELIVER_IT', 'Deliver it'),
      text: t('DELIVER_IT_INST', 'See the order details and make sure to deliver on time'),
      image: themeImage(theme, 'onboarding.slide_2'),
    },
    {
      key: 'slide_3',
      title: t('FOLLOW_ROUTE', 'Follow the route'),
      text: t('FOLLOW_ROUTE_INST', 'Choose a navigation service & start to follow the map route'),
      image: themeImage(theme, 'onboarding.slide_3'),
    },
    {
      key: 'slide_4',
      title: t('ADD_MORE_INFO', 'Add more info'),
      text: t('ADD_MORE_INFO_INST', 'Take pictures, get signatures or write notes on each order.'),
      image: themeImage(theme, 'onboarding.slide_4'),
    },
    {
      key: 'slide_5',
      title: t('COMPLETE_DELIVERY', 'Complete the delivery'),
      text: t('COMPLETE_DELIVERY_INST', 'Complete the delivery & inform everyone that the order is completed'),
      image: themeImage(theme, 'onboarding.slide_5'),
    }
  ];
  type Item = typeof data[0];
  // Page `onboarding`: the slides the theme shows, in its order.
  const { sections } = usePageSections('onboarding');
  const slides = sections
    .filter((section) => section.visible)
    .map((section) => data.find((slide) => slide.key === section.key))
    .filter(Boolean) as Item[];

  const tutorial = theme.native.components.tutorial;
  const { action, skip } = tutorial.slots;
  const { dot_color: dotColor, dot_active_color: dotActiveColor } = tutorial.base;
  const styles = useMemo(() => StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: themeColor(theme, 'background'),
      paddingTop: insets.top,
    },
    list: { flex: 1 },
    slide: { flex: 1 },
    // Layout of the slide: the image at the slides' proportions, in a box as high as the image so the
    // texts start right under it (decision of 2026-11-18); on a short window the box stops at its share
    // of the window and the image's foot is cut, so the texts keep their room.
    media: {
      height: Math.min(height * IMAGE_HEIGHT_SHARE, Math.round(width * IMAGE_RATIO)),
      width,
      overflow: 'hidden',
    },
    image: {
      width,
      height: Math.round(width * IMAGE_RATIO),
    },
    texts: {
      flex: 1,
      paddingTop: themeSpace(theme, 'xl'),
      paddingHorizontal: themeGutter(theme),
      gap: themeSpace(theme, 'sm'),
    },
    title: { ...nativeTextStyle(tutorial.base.title), color: tutorial.base.title_color },
    // The bar under the slides: the dots on the start side, Skip and Next or Done on the end.
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeSpace(theme, 'sm'),
      paddingTop: themeSpace(theme, 'sm'),
      paddingHorizontal: themeGutter(theme),
      paddingBottom: themeBottomSpace(theme, insets.bottom),
    },
    dots: { flex: 1, justifyContent: 'flex-start' },
    // Skip is the milder way out: `md` at its sides (Next keeps the button's own).
    skip: { paddingHorizontal: themeSpace(theme, 'md') },
    // The dot of the slide being seen is longer than the others: two of them side by side.
    activeDot: { width: themeSpace(theme, 'lg') },
  }), [theme, tutorial, insets.top, insets.bottom, width, height]);

  const _onDone = () => {
    setTutorial(false);
    _setStoreData('isTutorial', false);
  };

  // No slide to show: the tutorial is over.
  const isEmpty = slides.length === 0;
  useEffect(() => {
    if (isEmpty) _onDone();
  }, [isEmpty]);

  const _renderItem = ({ item }: { item: Item }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.media} testID='tutorial-media'>
          <Image source={item.image} resizeMode='cover' style={styles.image} />
        </View>
        <View style={styles.texts}>
          <OText style={styles.title} numberOfLines={2}>{item.title}</OText>
          <OText preset='body_lg' color='text_muted' numberOfLines={3}>{item.text}</OText>
        </View>
      </View>
    );
  };

  // Skip (on the first slide) goes to the last one, whose Done ends the tutorial.
  const renderPagination = ({ index, count, goTo, next }: { index: number, count: number, goTo: (index: number) => void, next: () => void }) => {
    const isLast = index === count - 1;
    return (
      <View style={styles.bar}>
        <PagerDots
          count={count}
          index={index}
          color={dotColor}
          activeColor={dotActiveColor}
          activeDotStyle={styles.activeDot}
          style={styles.dots}
        />
        {index === 0 && !isLast && themeVisible(theme, 'onboarding.skip') && (
          <OButton
            text={t('TUTORIAL_SKIP', 'Skip')}
            color={skip.color}
            appearance={skip.appearance}
            size={skip.size}
            style={styles.skip}
            onClick={() => goTo(count - 1)}
          />
        )}
        {isLast ? (
          <OButton
            text={t('TUTORIAL_DONE', "Let's start!")}
            color={action.color}
            appearance={action.appearance}
            size={action.size}
            onClick={_onDone}
          />
        ) : (
          <OButton
            text={t('TUTORIAL_NEXT', 'Next')}
            color={action.color}
            appearance={action.appearance}
            size={action.size}
            icon={<Icon name='arrow-forward' />}
            iconPosition='end'
            onClick={next}
          />
        )}
      </View>
    );
  };

  const _keyExtractor = (item: Item) => item.key;

  return (
    <View style={styles.page}>
      {!isEmpty && (
        <Pager
          data={slides}
          renderItem={_renderItem}
          keyExtractor={_keyExtractor}
          renderOverlay={renderPagination}
          listStyle={styles.list}
        />
      )}
    </View>
  );
};
export default IntroductoryTutorial;
