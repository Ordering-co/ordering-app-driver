import styled from 'styled-components/native'

export const Container = styled.View`
  display: flex;
  flex-direction: column;
`
export const ModalContainer = styled.View`
  background-color: ${({ theme }: any) => theme.colors.white};
  border-radius: 10px;
`
export const ModalTitle = styled.Text`
  font-style: normal;
  font-weight: 700;
  font-size: 20px;
  color: ${(props: any) => props.theme.colors.textGray};
`
export const StatusItemWrapper = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
  border-radius: 10px;
  padding: 10px;
  align-items: center;
`
export const StatusText = styled.Text`
  font-style: normal;
  font-weight: 700;
  font-size: 18px;
  color: ${(props: any) => props.theme.colors.textGray};
`
