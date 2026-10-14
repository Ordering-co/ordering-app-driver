import { Platform } from 'react-native'
import styled from 'styled-components/native'

export const Container = styled.View`
  flex: 1;
`

export const Header = styled.View`
  padding: ${Platform.OS === 'ios' ? '0px' : '15px'} 20px 0px;
`

export const Tabs = styled.View`
  flex-direction: row;
  background-color: ${(props: any) => props.theme.colors.inputChat};
  border-radius: 8px;
  margin: 0px 20px 15px;
  overflow: hidden;
`

export const Tab = styled.Pressable`
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0px 4px;
  background-color: ${(props: any) => props.isSelected ? props.theme.colors.yellowSecondary : props.theme.colors.transparent};
`

export const TabText = styled.Text`
  color: ${(props: any) => props.isSelected ? props.theme.colors.primary : props.theme.colors.unselectText};
  font-family: ${(props: any) => props.theme.fonts.primary.name};
  font-size: 14px;
  font-weight: ${(props: any) => props.isSelected ? 600 : 400};
`

export const List = styled.ScrollView`
  padding: 0px 20px;
`

export const Notice = styled.View`
  background-color: ${(props: any) => props.theme.colors.yellowSecondary};
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
`

export const NoticeText = styled.Text`
  color: ${(props: any) => props.theme.colors.textGray};
  font-family: ${(props: any) => props.theme.fonts.primary.name};
  font-size: 14px;
  line-height: 20px;
  margin-bottom: 10px;
`

export const PayoutItem = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-color: ${(props: any) => props.theme.colors.tabBar};
  border-width: 1px;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 10px;
`

export const PayoutInfo = styled.View`
  flex: 1;
  padding-right: 10px;
`

export const PayoutAmount = styled.View`
  align-items: flex-end;
`

export const PayoutTitle = styled.Text`
  color: ${(props: any) => props.theme.colors.textGray};
  font-family: ${(props: any) => props.theme.fonts.primary.name};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
`

export const PayoutText = styled.Text`
  color: ${(props: any) => props.theme.colors.unselectText};
  font-family: ${(props: any) => props.theme.fonts.primary.name};
  font-size: 13px;
  line-height: 18px;
`

export const PayoutStatus = styled.Text`
  color: ${(props: any) => props.color};
  font-family: ${(props: any) => props.theme.fonts.primary.name};
  font-size: 13px;
  font-weight: 600;
`

export const Footer = styled.View`
  margin: 10px 0px 40px;
`
