import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { FloatingButtonParams } from '../../types';
import { useFloatingButtonInset } from '../../hooks/useFloatingButtonInset';
import { Container, Button } from './styles';

import { FloatingButton as FloatingButtonController } from '@components';
import { OText } from '../shared';

const FloatingButtonUI = (props: FloatingButtonParams) => {
  const {
    btnLeftValue,
    btnRightValue,
    btnLeftValueShow,
    btnRightValueShow,
    btnText,
    colorTxt1,
    secondBtnText,
    firstColorCustom,
    secondColorCustom,
    secondButtonClick,
    firstButtonClick,
    disabled,
    color,
    isSecondaryBtn,
    secondButton,
    widthButton,
    isPadding,
    isHideRejectButtons,
    principalButtonColor
  } = props;

  const theme = useTheme();
  const floatingInset = useFloatingButtonInset();

  const basePaddingBottomIos = props.paddingBottomIos ?? 5;
  const paddingBottomIos = Math.max(basePaddingBottomIos, floatingInset);

  const styles = StyleSheet.create({
    primaryBtn: {
      backgroundColor: principalButtonColor ?? theme.colors.primary,
    },
    secodaryBtn: {
      backgroundColor: theme.colors.textSecondary,
    },
    btnTextStyle: {
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontSize: 18,
      paddingHorizontal: 10,
      paddingVertical: 10,
      position: 'absolute',
      width: '100%',
      left: 0,
      textAlign: 'center',
    },
  });

  return (
    <Container
      isIos={Platform.OS === 'ios'}
      paddingBottomIos={paddingBottomIos}
      style={{ paddingHorizontal: props.isPadding ? 20 : 0 }}>
      <View
        style={{
          flexDirection: 'column-reverse',
          width: '100%',
          justifyContent: 'space-between',
        }}>
        {!isHideRejectButtons && (
          <Button
            secondButton={secondButton}
            style={[
              {
                borderWidth: colorTxt1 ? 1 : 0,
                borderColor: colorTxt1 ? colorTxt1 : null,
                marginTop: 10,
              },
              secondButton
                ? { backgroundColor: firstColorCustom || styles.primaryBtn }
                : color
                ? { backgroundColor: color }
                : styles.primaryBtn,
              ,
              { width: widthButton },
            ]}
            onPress={firstButtonClick}
            disabled={disabled}>
            <OText color={theme.colors.white} size={16} mLeft={20} weight='700'>
              {btnLeftValueShow ? btnLeftValue : ''}
            </OText>

            <OText
              style={styles.btnTextStyle}
              color={colorTxt1 ? colorTxt1 : theme.colors.white}
              numberOfLines={2}
              adjustsFontSizeToFit
              weight='700'>
              {btnText}
            </OText>

            <OText color={theme.colors.white} size={16} mRight={20}>
              {btnRightValueShow ? btnRightValue : ''}
            </OText>
          </Button>
        )}

        {secondButton && (
          <Button
            secondButton={secondButton}
            style={[
              secondButton
                ? { backgroundColor: secondColorCustom || styles.secodaryBtn }
                : color
                ? color
                : styles.secodaryBtn,
              ,
              { width: widthButton },
            ]}
            onPress={secondButtonClick}
            disabled={disabled}>
            <OText color={theme.colors.white} size={16} mLeft={20} weight='700'>
              {btnLeftValueShow ? btnLeftValue : ''}
            </OText>

            <OText
              style={styles.btnTextStyle}
              color={theme.colors.white}
              numberOfLines={2}
              adjustsFontSizeToFit
              weight='700'>
              {secondBtnText}
            </OText>

            <OText color={theme.colors.white} size={16} mRight={20} weight='700'>
              {btnRightValueShow ? btnRightValue : ''}
            </OText>
          </Button>
        )}
      </View>
    </Container>
  );
};

export const FloatingButton = (props: FloatingButtonParams) => {
  const floatingButtonProps = {
    ...props,
    UIComponent: FloatingButtonUI,
  };

  return <FloatingButtonController {...floatingButtonProps} />;
};
