import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import OText from './OText'
import OIconButton from './OIconButton'

interface Props {
  title?: string
  onBack: () => void
}

const ONavbar = (props: Props) => {
  const { title, onBack } = props
  const theme = useTheme()
  const styles = StyleSheet.create({
    header: {
      width: '100%',
      alignItems: 'center',
      flexDirection: 'row',
      position: 'relative',
      paddingBottom: 15,
    },
    arrowLeft: {
      marginRight: 10,
      position: 'absolute',
      top: -20,
      left: -20,
    },
    title: {
      fontWeight: '700',
      fontSize: 24,
      color: theme.colors.textGray,
      fontFamily: `${theme.fonts.special.name}_18pt-Black`,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center'
    },
  });
  return (
    <View style={styles.header}>
      <View>
        <OIconButton
          icon={theme.images.general.arrow_left}
          borderColor={theme.colors.clear}
          iconStyle={{ width: 24, height: 24 }}
          style={styles.arrowLeft}
          onClick={onBack}
        />
      </View>
      {Boolean(title) && (
        <View style={styles.titleContainer}>
          <OText style={styles.title}>{title}</OText>
        </View>
      )}
    </View>
  )
}

export default ONavbar
