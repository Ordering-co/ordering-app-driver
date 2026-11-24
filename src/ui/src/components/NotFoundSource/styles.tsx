import styled from 'styled-components/native';
import { radiusCss } from '@/theme/helpers';

// `components.empty_state`: the box, the image over the message and the action under it.
const look = (theme: any) => theme.native.components.empty_state.base;
const px = (value: number) => `${value}px`;

export const NotFound = styled.View`
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: ${({ theme }: any) => px(look(theme).min_height)};
  margin-vertical: ${({ theme }: any) => px(look(theme).margin)};
  padding-vertical: ${({ theme }: any) => px(look(theme).padding_y)};
  padding-horizontal: ${({ theme }: any) => px(look(theme).padding_x)};
`;

// The picture is a square of `image_size`, rounded as a dialog (`lg`, whatever Identity's level is) and centered over the message.
export const NotFoundImage = styled.Image`
  width: ${({ theme }: any) => px(look(theme).image_size)};
  height: ${({ theme }: any) => px(look(theme).image_size)};
  border-radius: ${({ theme }: any) => radiusCss(theme, 'lg', { fixed: true })};
  margin-bottom: ${({ theme }: any) => px(look(theme).image_gap)};
`;

// The icon is as tall as it is (not the picture's room: a 40 pt icon in 220 pt reads as detached
// from its message, seen on a device), with the picture's gap under it.
export const NotFoundIcon = styled.View`
  width: 100%;
  margin-bottom: ${({ theme }: any) => px(look(theme).image_gap)};
  align-items: center;
  justify-content: center;
`;

export const NotFoundAction = styled.View`
  width: 100%;
  margin-top: ${({ theme }: any) => px(look(theme).actions_gap)};
`;
