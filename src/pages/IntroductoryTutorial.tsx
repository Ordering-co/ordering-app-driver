import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, StatusBar, Platform } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import IconAntDesign from 'react-native-vector-icons/AntDesign'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLanguage } from '@components';
import { DeviceOrientationMethods, StoreMethods, SafeAreaContainer } from '@ui'

const { useDeviceOrientation } = DeviceOrientationMethods
const { _setStoreData } = StoreMethods

const IntroductoryTutorial = ({ navigation, route }: any) => {
  const [, t] = useLanguage();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [orientationState] = useDeviceOrientation();
  const [showSkipButton, setShowSkipButton] = useState(true)
  const WIDTH_SCREEN = orientationState?.dimensions?.width
  const HEIGHT_SCREEN = orientationState?.dimensions?.height
  const setTutorial = route?.params?.setTutorial;
  const data = [
    {
      title: t('MOBILE_NEW_ORDER', 'New Order'),
      text: t('NEW_ORDER_INST', 'Alerts will come whenever you have a new order to deliver.'),
      image: theme.images.tutorials.slide1,
      bg: theme.colors.white,
    },
    {
      title: t('DELIVER_IT', 'Deliver it'),
      text: t('DELIVER_IT_INST', 'See the order details and make sure to deliver on time'),
      image: theme.images.tutorials.slide2,
      bg: theme.colors.white,
    },
    {
      title: t('FOLLOW_ROUTE', 'Follow the route'),
      text: t('FOLLOW_ROUTE_INST', 'Choose a navigation service & start to follow the map route'),
      image: theme.images.tutorials.slide3,
      bg: theme.colors.white,
    },
    {
      title: t('ADD_MORE_INFO', 'Add more info'),
      text: t('ADD_MORE_INFO_INST', 'Take pictures, get signatures or write notes on each order.'),
      image: theme.images.tutorials.slide4,
      bg: theme.colors.white,
    },
    {
      title: t('COMPLETE_DELIVERY', 'Complete the delivery'),
      text: t('COMPLETE_DELIVERY_INST', 'Complete the delivery & inform everyone that the order is completed'),
      image: theme.images.tutorials.slide5,
      bg: theme.colors.white,
    }
  ];
  type Item = typeof data[0];
  const styles = StyleSheet.create({
    slide: {
      flex: 1,
      paddingBottom: 80,
    },
    cardmedia: {
      height: HEIGHT_SCREEN * 0.6634645,
      width: WIDTH_SCREEN,
      overflow: 'hidden',
      alignSelf: 'baseline',
    },
    cardcontent: {
      flex: 1,
      paddingTop: 30,
      paddingHorizontal: 30,
    },
    image: {
      flex: 0,
      width: '100%',
      height: '100%',
    },
    text: {
      color: '#344050',
      fontSize: 18,
      lineHeight: 28,
      fontFamily: 'Poppins',
      top: HEIGHT_SCREEN * 0.005,
      textAlign: 'left',
      width: WIDTH_SCREEN * .85
    },
    title: {
      bottom: HEIGHT_SCREEN * 0.01,
      fontFamily: 'Poppins',
      fontSize: 22,
      fontWeight: 'bold',
      color: '#344050',
      textAlign: 'left',
      width: WIDTH_SCREEN * .85
    },
    buttonCircle: {
      top: 3,
      width: 90,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center'
    },
    tutorialText: {
      fontSize: 16,
      fontWeight: '300',
      color: theme.colors.primary,
    },
  });

  const radio = 1369 / 1242
  const imageHeight = Math.round(WIDTH_SCREEN * radio);
  const imageWidth = WIDTH_SCREEN;

  const _renderItem = ({ item }: { item: Item }) => {
    return (
      <View
        style={{
          ...styles.slide,
          backgroundColor: item.bg,
          paddingTop: insets.top,
          paddingBottom: 80 + insets.bottom,
        }}>
        <View style={styles.cardmedia}>
          <Image source={item.image} resizeMode='cover' style={{ height: imageHeight, width: imageWidth }} />
        </View>
        <View style={styles.cardcontent}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.text} numberOfLines={3}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const RenderNextButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        right: 0
      }}>
        <Text style={styles.tutorialText}>{t('TUTORIAL_NEXT', 'Next')}{' '}
          <IconAntDesign
            name='arrowright'
            color={theme.colors.primary}
            size={16}
          />
        </Text>
      </View>
    );
  };

  const RenderSkipButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        marginLeft: Platform.OS === 'ios' ? 0 : WIDTH_SCREEN * .45,
        start: Platform.OS === 'ios' ? WIDTH_SCREEN * 0.45 : 0
      }}>
        <Text style={styles.tutorialText}>
          {t('TUTORIAL_SKIP', 'Skip')}
        </Text>
      </View>
    );
  };

  const RenderPrevButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        start: WIDTH_SCREEN * 0.7
      }}>
        <Text style={styles.tutorialText}>{t('TUTORIAL_BACK', 'Back')}</Text>
      </View>
    );
  };

  const RenderDoneButton = () => {
    return (
      <View style={{
        ...styles.buttonCircle,
        right: 0
      }}>
        <Text style={styles.tutorialText}>{t('TUTORIAL_DONE', "Let's start!")}</Text>
      </View>
    );
  };

  const _onDone = () => {
    setTutorial(false);
    _setStoreData('isTutorial', false);
  };

  const _keyExtractor = (item: Item) => item.title;

  return (
    <SafeAreaContainer edges={[]} style={{ backgroundColor: theme.colors.white }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.white}
        translucent={false}
      />
      <AppIntroSlider
        keyExtractor={_keyExtractor}
        renderItem={_renderItem}
        data={data}
        onDone={_onDone}
        activeDotStyle={{
          backgroundColor: theme.colors.primary,
          position: 'relative',
          right: WIDTH_SCREEN * 0.29,
          width: 8.3,
          height: 8.3
        }}
        dotStyle={{
          backgroundColor: 'lightgray',
          position: 'relative',
          right: WIDTH_SCREEN * 0.29,
          width: 8,
          height: 8
        }}
        renderDoneButton={RenderDoneButton}
        renderNextButton={RenderNextButton}
        renderSkipButton={RenderSkipButton}
        showSkipButton={showSkipButton}
        onSlideChange={(index) => {
          index >= 1 ? setShowSkipButton(false) : setShowSkipButton(true)
        }}
      />
    </SafeAreaContainer>
  );
};
export default IntroductoryTutorial;
