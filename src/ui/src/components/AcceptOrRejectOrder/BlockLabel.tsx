import React from 'react'
import { View } from 'react-native'

import { OText } from '../shared'

/**
 * The label of a block of the accept / reject forms ("What happened?", "Upload status image", "Security code"): the
 * field label's role (`label`, 14 and semibold) with, when the block has one, a line under it in the muted metadata
 * look (`body_sm`). Not a section title: the boards draw these small, over a block of one control. The space under it
 * is its parent's gap.
 */
export const BlockLabel = ({ children, description, testID }: { children: React.ReactNode, description?: React.ReactNode, testID?: string }) => (
  <View testID={testID}>
    <OText preset='label'>{children}</OText>
    {!!description && <OText preset='body_sm' color='text_muted'>{description}</OText>}
  </View>
)

export default BlockLabel
