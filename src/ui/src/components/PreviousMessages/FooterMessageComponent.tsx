import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import { OButton, MessageListSkeleton } from '../shared'
import { themeSpace } from '@/theme/helpers'

/** The end of the messages list: the rows loading next, or the button that asks for them. */
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

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => StyleSheet.create({
    more: { marginTop: themeSpace(theme, 'xs'), marginBottom: themeSpace(theme, 'sm') },
  }), [theme])

  return (
    <>
      {(loading || reload) && skeletonCount > 0 && (
        <MessageListSkeleton count={skeletonCount} />
      )}

      {pagination?.totalPages &&
        !loading &&
        !reload &&
        JSON.stringify(tabsFilter) === JSON.stringify(tabs[0].tags) &&
        pagination?.currentPage < pagination?.totalPages && (
          <View style={styles.more}>
            <OButton
              onClick={() => loadMore && loadMore()}
              text={t('LOAD_MORE_ORDERS', 'Load more orders')}
            />
          </View>
        )}
    </>
  )
}
