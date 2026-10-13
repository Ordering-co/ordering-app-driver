import styled, { css } from 'styled-components/native';

export const OrderDetailsContainer = styled.ScrollView`
  flex: 1;
  max-height: ${(props: any) => props.hasFloatingButton ? '85%' : '100%'};
`;

export const Pickup = styled.View`
  padding-vertical: 20px;
  margin-bottom: 20px;
`;

export const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding-horizontal: 20px;
  padding-vertical: 10px;
`;

export const Actions = styled.View`
  flex-direction: row;
  justify-content: flex-end;
`;

export const Logo = styled.View`
  margin-right: 20px;
`;

export const OrderContent = styled.View`
  ${(props: any) => props.isOrderGroup && css`
    border-color: rgba(0, 0, 0, 0.2);
    border-width: 1px;
    padding: 10px;
  `
  }
  ${(props: any) => props.lastOrder && css`
    margin-bottom: 50px;
  `}
`;

export const OrderHeader = styled.View`
  padding-top: 20px;
  padding-bottom: 10px;
  padding-horizontal: 20px;
`;

export const OrderBusiness = styled.View`
  position: relative;
  flex-direction: column;
  align-items: flex-start;
  background-color: ${(props: any) => props.theme.colors.gray100};
  border-radius: 10px;
  padding-horizontal: 15px;
  padding-vertical: 20px;
  margin-bottom: 20px;
`;

export const OrderCustomer = styled.View`
  position: relative;
  flex-direction: column;
  align-items: flex-start;
  background-color: ${(props: any) => props.theme.colors.gray100};
  border-radius: 10px;
  padding-horizontal: 15px;
  padding-vertical: 20px;
  margin-bottom: 20px;
`;

export const OrderProducts = styled.View`
  flex: 1;
`;

export const Table = styled.View`
  flex-direction: row;
  justify-content: space-between;
  flex: 1;
  align-items: center;
`;

export const OrderBill = styled.View`
  padding-vertical: 20px;
  ${(props: any) => !props.vehicleExists && css`
    padding-bottom: 20px;
  `
  }
  flex: 1;
`;

export const OrderVehicle = styled.View`
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.theme.colors.gray100};
  padding-vertical: 20px;
  padding-bottom: 50px;
  flex: 1;
`;

export const OrderSpot = styled.View`
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.theme.colors.gray100};
  padding-vertical: 20px;
  ${(props: any) => !props.vehicleExists && css`
    padding-bottom: 50px;
  `}
  flex: 1;
`;

export const Total = styled.View`
  border-top-width: 5px;
  border-top-color: ${(props: any) => props.theme.colors.gray100};
  padding-top: 20px;
  margin-top: 20px;
`;

export const DriverItem = styled.View`
  padding-horizontal: 15px;
  padding-vertical: 10px;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  justify-content: ${(props: any) =>
    props?.justifyContent ? props?.justifyContent : 'flex-start'};
`;

export const AssignDriver = styled.View`
  border-top-width: 5px;
  border-top-color: ${(props: any) => props.theme.colors.gray100};
  padding-vertical: 10px;
  margin-bottom: 10px;
  margin-horizontal: 20px;
`;

export const OSRow = styled.View`
  flex-direction: row;
  overflow: hidden;
  width: 70%;
  flex-wrap: wrap;
`

export const Messages = styled.View`
position: relative;
`;

export const Dot = styled.View`
position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${(props: any) => props.theme.colors.red};
  top: 10px;
  right: 10px;
  z-index: 99;
`;

export const Section = styled.View`
  border-radius: 10px;
  background-color: ${(props: any) => props.theme.colors.gray100};
`;

export const OrderPayments = styled(OrderBusiness)``
