import styled from "styled-components/native";

export const DayContainer = styled.View`
  flex-direction: row;
  width: 100%;
  border-radius: 10px;
  background-color: ${({ theme }: any) => theme.colors.gray100};
  padding: 15px;
  margin-bottom: 10px;
`
