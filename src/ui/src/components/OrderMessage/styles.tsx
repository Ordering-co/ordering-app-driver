import styled from 'styled-components/native';

export const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 12px;
  padding-vertical: 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: any) => props.theme.colors.borderTops};
  background-color: ${(props: any) => props.theme.colors.white};
`;

export const HeaderContent = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  min-width: 0;
  margin-left: 4px;
`;

export const AvatarWrapper = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  overflow: hidden;
  margin-right: 12px;
  background-color: ${(props: any) => props.theme.colors.gray100};
  align-items: center;
  justify-content: center;
`;

export const TextColumn = styled.View`
  flex: 1;
  min-width: 0;
  justify-content: center;
`;

export const ChatWrapper = styled.View`
  flex: 1;
`;
