import { useConfig } from '@components'

import { projectCombinesTabs, useOfflineActions } from '../../context/OfflineActions'

/**
 * Whether the Orders screen draws three tabs (pending and in progress together) or four, worked out in the render that paints them:
 *  - the project's loaded config wins (`combine_pending_and_progress_orders`), read from the configs the app already holds;
 *  - until it loads (a cold start, or the app opened offline) the value an earlier run kept stands in: the provider
 *    (`OfflineActionsProvider`) reads it when the app starts and writes it from every loaded config;
 *  - with neither, the tabs are `pending`: the screen holds its tab bar (and its list) while the config is still loading or the kept value
 *    is still being read, so it never paints the wrong set first. Once the config has failed to load (no connection) and nothing was ever
 *    kept, the project's switch cannot be known and the default is drawn: the four tabs.
 */
export const useCombinedTabs = (): { combined: boolean, pending: boolean } => {
  const [configState] = useConfig()
  const [offline] = useOfflineActions()

  const known = projectCombinesTabs(configState)
  if (known !== undefined) return { combined: known, pending: false }

  const kept = offline?.isCombinedTabs
  if (typeof kept === 'boolean') return { combined: kept, pending: false }

  return { combined: false, pending: !offline?.combinedTabsRead || !!configState?.loading }
}
