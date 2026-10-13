const { View, Text, TouchableOpacity } = require('react-native')

module.exports = function AppIntroSlider (props) {
  return (
    <View testID="intro-slider">
      <Text testID="intro-slide-title">{props.data?.[0]?.title}</Text>
      <TouchableOpacity testID="intro-done" onPress={props.onDone} />
      <TouchableOpacity
        testID="intro-slide-change"
        onPress={() => props.onSlideChange?.(1)}
      />
      {props.renderNextButton?.()}
      {props.renderSkipButton?.()}
    </View>
  )
}
