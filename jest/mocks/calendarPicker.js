const { View, TouchableOpacity } = require('react-native')

module.exports = function CalendarPicker (props) {
  return (
    <View testID="calendar-picker">
      <TouchableOpacity
        testID="calendar-select-start"
        onPress={() => props.onDateChange?.({ format: () => '01/15/26' }, 'START_DATE')}
      />
      <TouchableOpacity
        testID="calendar-select-end"
        onPress={() => props.onDateChange?.({ format: () => '01/20/26' }, 'END_DATE')}
      />
    </View>
  )
}
