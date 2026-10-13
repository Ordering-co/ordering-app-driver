import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { OButton } from '@ui';

interface ValidationIssuesListProps {
  issues: any[];
  showActions?: boolean;
}

export const ValidationIssuesList: React.FC<ValidationIssuesListProps> = ({
  issues,
  showActions = true
}) => {
  const theme = useTheme();

  return (
    <>
      {issues.map((issue, index) => (
        <View
          key={index}
          style={[
            styles.validationMessageItem,
            index === issues.length - 1 && { marginBottom: 0 }
          ]}
        >
          <View style={styles.issueHeader}>
            <MCIcon
              name="alert-circle"
              color={theme.colors.red}
              size={16}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Text style={styles.validationMessageText}>
              {issue.message}
            </Text>
          </View>
          {showActions && issue.action && issue.actionText && (
            <OButton
              text={issue.actionText}
              onClick={issue.action}
              bgColor={theme.colors.primary}
              borderColor={theme.colors.primary}
              textStyle={{ color: '#FFF', fontSize: 14 }}
              style={styles.actionButton}
            />
          )}
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  validationMessageItem: {
    marginBottom: 8
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  validationMessageText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18
  },
  actionButton: {
    marginTop: 10,
    borderRadius: 7,
    height: 45,
    width: '100%'
  }
});
