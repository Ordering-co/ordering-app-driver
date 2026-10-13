import React from 'react';
import { StyleSheet, View } from 'react-native';
import { OText } from '@ui';
import { useTheme } from 'styled-components/native';

interface Props {
  title: string;
  address: string;
}

const LocationIndicator = (props: Props) => {
  const { title, address } = props;
  const theme = useTheme();
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 10,
    },
    leftColumn: {
      alignItems: 'center',
      marginRight: 12,
      marginTop: 3,
    },
    rightColumn: {
      flex: 1,
      justifyContent: 'space-between',
    },
    circle: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    circleTop: {
      backgroundColor: theme?.colors?.textGray,
    },
    circleBottom: {
      backgroundColor: theme?.colors?.primary,
    },
    line: {
      width: 1,
      height: 20,
      borderWidth: 1,
      borderColor: theme?.colors?.textGray,
      borderStyle: 'dashed',
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
    },
    textTop: {
      marginBottom: 8,
    },
    textBottom: {},
  });

  return (
    <View style={styles.container}>
      {/* Left column for circles and line */}
      <View style={styles.leftColumn}>
        <View style={[styles.circle, styles.circleTop]} />
        <View style={styles.line} />
        <View style={[styles.circle, styles.circleBottom]} />
      </View>

      {/* Right column for text */}
      <View style={styles.rightColumn}>
        <OText style={{ ...styles.text, ...styles.textTop }}>{title}</OText>
        <OText style={{ ...styles.text, ...styles.textBottom }}>{address}</OText>
      </View>
    </View>
  );
};



export default LocationIndicator;
