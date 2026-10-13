import React from 'react';
import { Platform } from 'react-native'
import styled from 'styled-components/native';

import { useSession, useLanguage } from '@components';
import {
  NotFoundSource,
  FloatingButton
} from '@ui';

const NotFound = ({ navigation }: any) => {
  const [{ auth }] = useSession();
  const [, t] = useLanguage();

  const btnTitle = !auth
    ? t('GO_TO_HOMEPAGE', 'Go to homepage')
    : t('GO_TO_BUSINESSLIST', 'Go to business list');

  const handleNavigate = () => {
    auth ? navigation.navigate('BusinessList') : navigation.navigate('Home');
  };

  const KeyboardView = styled.KeyboardAvoidingView`
    flex-grow: 1;
    backgroundColor: ${(props: any) => props.theme.colors.backgroundPage};
    padding: 30px;
    display: flex;
    alignItems: center;
    justifyContent: center;
  `;

  return (
    <>
      <KeyboardView
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <NotFoundSource
          content={t('PAGE_NOT_FOUND', 'Page not found')}
          conditioned={false}
        />
      </KeyboardView>
      <FloatingButton
        btnText={btnTitle}
        isSecondaryBtn={false}
        firstButtonClick={handleNavigate}
        widthButton={'100%'}
        isPadding
        paddingBottomIos={20}
      />
    </>
  );
};

export default NotFound;
