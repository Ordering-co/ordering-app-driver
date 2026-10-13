import React from 'react'
import { StyleSheet } from 'react-native'

import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import { OButton, OrderListSkeleton } from '../shared'

export const FooterComponent = (props: any) => {
  const {
    loading,
    reload,
    pagination,
    tabsFilter,
    tabs,
    loadMore,
    skeletonCount = 2,
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()

  const styles = StyleSheet.create({
    loadButton: {
      borderRadius: 7.6,
      height: 44,
      marginRight: 10,
      marginBottom: 10,
      marginTop: 5,
    },
    loadButtonText: {
      color: theme.colors.white,
      fontFamily: 'Poppins',
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontSize: 18,
    },
  })

  return (
    <>
      {(loading || reload) && skeletonCount > 0 && (
        <OrderListSkeleton count={skeletonCount} />
      )}

      {pagination?.totalPages &&
        !loading &&
        !reload &&
        JSON.stringify(tabsFilter) === JSON.stringify(tabs[0].tags) &&
        pagination?.currentPage < pagination?.totalPages && (
          <OButton
            onClick={() => loadMore && loadMore()}
            text={t('LOAD_MORE_ORDERS', 'Load more orders')}
            imgRightSrc={null}
            textStyle={styles.loadButtonText}
            style={styles.loadButton}
            bgColor={theme.colors.primary}
            borderColor={theme.colors.primary}
          />
        )}
    </>
  )
}
