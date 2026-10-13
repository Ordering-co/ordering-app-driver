import { css } from 'styled-components';
import styled from 'styled-components/native';

export const Card = styled.View`
  flex: 1;
  flex-direction: row;
`;

export const Logo = styled.View`
  width: 75px;
  height: 75px;
`;

export const Information = styled.View`
  position: relative;
  justify-content: space-between;
  align-items: flex-start;
  margin-horizontal: 5px;
  flex: 1;
  max-height: 60px;
  ${({ isShowTimer }: any) => isShowTimer && css`
    bottom: 10px
  `}
`;

export const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

export const Badge = styled.View`
  background-color: ${({ theme }: any) => theme.colors.secondary};
  border-radius: 22px;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 1px 4px;
`;
