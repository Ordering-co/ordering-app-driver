import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { useLanguage } from '@components';
import { themeVisible } from '@/theme/helpers';
import { OText } from '../shared';
import { useOrderPayment } from '../../hooks/useOrderPayment';
import { collectStyles } from './styles';

/**
 * What the driver collects from the customer, at the top of the delivery
 * sheet. A cash order says so ("Collect in cash"), with the bill the customer
 * pays with when there is one; any other says how it is paid, as the order's
 * details write it. The amount is the order's total, hidden with the
 * visibility key of the total (`confirmation.order.total`).
 */
export const CollectRecap = ({ order }: { order?: any }) => {
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const payment = useOrderPayment(order);
  const styles = useMemo(() => collectStyles(theme), [theme]);

  const showTotal = themeVisible(theme, 'confirmation.order.total');

  return (
    <View style={styles.box} testID='collect-recap'>
      <View style={styles.text}>
        <OText preset='label'>
          {payment.isCashOnly ? t('COLLECT_IN_CASH', 'Collect in cash') : payment.text}
        </OText>
        {!!payment.change && <OText preset='body_sm'>{payment.change}</OText>}
      </View>
      {showTotal && <OText preset='h3' testID='collect-total'>{payment.total}</OText>}
    </View>
  );
};
