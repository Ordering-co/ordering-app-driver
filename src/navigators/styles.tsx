import styled from 'styled-components/native';

export const BottomTabIconContainer = styled.View`
  width: 120px;
  height: 60px;
  position: relative;
  align-items: center;
  justify-content: ${(props: any) => !props.isIos ? 'flex-start' : 'space-evenly'};
  bottom: ${(props: any) => !props.isIos ? '10px' : '13px'};
`
