import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { Icon, OButton, OText } from '../shared'
import { issuesStyles } from './styles'

interface ValidationIssuesListProps {
  issues: any[];
  showActions?: boolean;
}

/**
 * The location requirements a status change does not meet: one line per
 * requirement and, in the dialog, the action that solves it (refresh the
 * location, open the settings).
 */
export const ValidationIssuesList: React.FC<ValidationIssuesListProps> = ({
  issues,
  showActions = true
}) => {
  const theme: any = useTheme()
  const styles = useMemo(() => issuesStyles(theme), [theme])

  return (
    <View style={styles.list}>
      {issues.map((issue, index) => (
        <View key={index} style={styles.issue}>
          <View style={styles.message}>
            <Icon name='alert-circle' size={theme.native.components.order_details.base.detail_icon_size} color='danger_text' />
            <OText preset='body' style={styles.text}>
              {issue.message}
            </OText>
          </View>
          {showActions && issue.action && issue.actionText && (
            <OButton
              text={issue.actionText}
              onClick={issue.action}
            />
          )}
        </View>
      ))}
    </View>
  )
}
