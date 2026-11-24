import React from 'react';
import { useTheme } from 'styled-components/native';
import { NotFoundSourceParams } from '../../types';
import { NotFound, NotFoundAction, NotFoundIcon, NotFoundImage } from './styles';
import { Icon, OButton, OText } from '../shared';
import { themePart, themeImage } from '@/theme/helpers';

/**
 * The empty or error state of a list or a screen (`components.empty_state`):
 * a picture (the caller's, or the theme's `empty.not_found` while the served theme sets one;
 * no picture is bundled: without one, an icon in the theme's brand color, at the state's own
 * `icon_size`, with the picture's gap under it), a message, what the caller adds under it (its children) and an action as wide
 * as the box (`btnTitle` and `onClickButton`).
 */
export const NotFoundSource = (props: NotFoundSourceParams) => {
  const { image, content, btnTitle, btnDisabled = false, conditioned, onClickButton } = props;
  const theme = useTheme();
  const source = image || themeImage(theme, 'empty.not_found');
  const iconSize = themePart(theme, 'empty_state', 'base.icon_size');

  return (
    <NotFound>
      {source
        ? <NotFoundImage source={source} resizeMode='contain' />
        : (
          <NotFoundIcon testID='not-found-icon'>
            <Icon name='file-tray-outline' size={iconSize} color='primary_text' />
          </NotFoundIcon>
        )}
      {!!content && !conditioned && (
        <OText preset='body_lg' color='text_muted' align='center'>
          {content}
        </OText>
      )}
      {props.children}
      {onClickButton && (
        <NotFoundAction>
          <OButton onClick={() => onClickButton()} text={btnTitle} disabled={btnDisabled} />
        </NotFoundAction>
      )}
    </NotFound>
  );
};
