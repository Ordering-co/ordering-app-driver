import styled from 'styled-components/native'

export const Content = styled.ScrollView`
  background-color: ${(props: any) => props.theme.colors.white};
  margin-bottom: 30px;
`;
export const ActionButtonWrapper = styled.View`
  margin-bottom: 10px;
  justify-content: center;
  align-items: center;
  margin-horizontal: 20px;
  margin-bottom: 40px;
`
export const CustomerInfoContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
`
export const RatingBarContainer = styled.View`
  margin-top: 13px;
  margin-bottom: 25px;
`
export const RatingTextContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
`
export const CommentsButtonGroup = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
`
