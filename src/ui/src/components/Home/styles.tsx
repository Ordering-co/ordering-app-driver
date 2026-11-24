import styled from 'styled-components/native';

export const BackgroundImage = styled.ImageBackground`
  flex: 1;
  width: 100%;
`;

// The hero's overlay over the photo (`home_hero.overlay`).
export const Overlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }: any) => theme.native.components.home_hero.base.overlay};
`;
