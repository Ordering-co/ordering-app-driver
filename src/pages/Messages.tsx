import React from 'react';

import { MessagesOption, SafeAreaContainerLayout } from '@ui';

const Messages = ({ navigation }: any) => {
  const MyOrderProps = {
    navigation,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      navigation.navigate(page, params);
    },
    firstFetch: 'orders',
    sortParams: {
      param: 'last_direct_message_at',
      direction: 'asc',
    },
    paginationSettings: {
      page: 1,
      pageSize: 45,
      controlType: 'infinity',
    },
  };

  // The layout gives the safe area and the page's background; the list carries the gutter.
  return (
    <SafeAreaContainerLayout>
      <MessagesOption {...MyOrderProps} />
    </SafeAreaContainerLayout>
  );
};

export default Messages;
