import styled from 'styled-components/native'

export const SessionsWrapper = styled.ScrollView``

export const SessionItem = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-color: ${(props: any) => props.theme.colors.tabBar};
  border-width: 1px;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 10px;
`
export const DurationWrapper = styled.View`
  /* flex-direction: row; */
`

export const Container = styled.View`
  padding-top: ${(props: any) => props.pdng};
  margin-bottom: 50px;
`
