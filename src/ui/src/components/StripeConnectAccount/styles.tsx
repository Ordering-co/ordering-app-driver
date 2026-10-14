import { Platform } from 'react-native'
import styled from 'styled-components/native'

export const Container = styled.View`
  flex: 1;
`

export const Header = styled.View`
  padding: ${Platform.OS === 'ios' ? '0px' : '15px'} 20px 0px;
`

export const Content = styled.ScrollView`
  padding: 0px 20px;
`

export const StatusCard = styled.View`
  align-items: center;
  border-color: ${(props: any) => props.theme.colors.tabBar};
  border-width: 1px;
  border-radius: 10px;
  padding: 30px 20px;
  margin-bottom: 20px;
`

export const StatusIcon = styled.View`
  margin-bottom: 15px;
`

export const StatusTitle = styled.Text`
  color: ${(props: any) => props.theme.colors.textGray};
  font-family: ${(props: any) => props.theme.fonts.primary.name};
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 10px;
`

export const StatusDescription = styled.Text`
  color: ${(props: any) => props.theme.colors.unselectText};
  font-family: ${(props: any) => props.theme.fonts.primary.name};
  font-size: 15px;
  line-height: 22px;
  text-align: center;
`

export const PlaceholderCard = styled.View`
  border-color: ${(props: any) => props.theme.colors.tabBar};
  border-width: 1px;
  border-radius: 10px;
  padding: 30px 20px;
`
