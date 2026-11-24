import React, { useMemo, useState } from 'react'
import { inputTint, singleLineInput } from './singleLineInput'
import { FlatList, Pressable, StyleSheet, TextInput, View, ViewStyle, useWindowDimensions } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeBoxStyle, nativeTextStyle, reservedBorder, themeColor, themeSpace } from '@/theme/helpers'
import OBottomPopup from './OBottomPopup'
import OText from './OText'
import Icon from './Icon'

/**
 * The app's one select: whatever opens a list of choices (languages, countries,
 * dates, students, spots…) opens it in a sheet (`components.sheet`), with the
 * rows of `components.menu`. The trigger has the input's look
 * (`components.input`, `md`) unless the caller draws its own with
 * `renderTrigger` (a chip, a flag).
 *
 *   <OSelect title={t('LANGUAGE', 'Language')} options={languages} value={code} onSelect={setCode} />
 */
export interface SelectOption {
  value: any
  /** The row's text (also searched). */
  label?: string
  /** Legacy names of the label. */
  name?: string
  content?: React.ReactNode
  /** Something before the label (a flag, an avatar). */
  leading?: React.ReactNode
  disabled?: boolean
}

interface Props {
  options: SelectOption[]
  value?: any
  onSelect: (value: any, option: SelectOption) => void
  placeholder?: string
  /** The sheet's title. */
  title?: string
  /** A search field over the rows (long lists: countries). */
  searchable?: boolean
  searchPlaceholder?: string
  disabled?: boolean
  hasError?: boolean
  /** The caller's own trigger; `open` shows the sheet. */
  renderTrigger?: (state: { open: () => void, selected?: SelectOption, disabled: boolean }) => React.ReactNode
  style?: ViewStyle
  testID?: string
}

const labelOf = (option?: SelectOption) =>
  option ? option.label ?? option.name ?? (typeof option.content === 'string' ? option.content : '') : ''

const selectStyles = (theme: any, windowHeight: number) => {
  const input = theme.native.components.input
  const menu = theme.native.components.menu.base
  const sheet = theme.native.components.sheet.base
  // The same border room as a one-line field in every state: a select's text starts where a field's does.
  const states = input.variants.default.states
  const ring = reservedBorder([input.base, states.focus, states.error, states.disabled])
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: input.base.icon_gap,
      minHeight: input.sizes.md.height,
      paddingHorizontal: input.base.padding_x,
      borderRadius: input.base.radius,
      ...nativeBoxStyle(input.base),
      ...ring(input.base),
    },
    triggerError: { ...nativeBoxStyle(states.error), ...ring(states.error, input.base) },
    triggerDisabled: { ...nativeBoxStyle(states.disabled), ...ring(states.disabled, input.base) },
    triggerText: { ...nativeTextStyle(input.base.text), color: input.base.text_color, flex: 1 },
    placeholder: { color: input.base.placeholder },
    search: {
      ...singleLineInput,
      marginHorizontal: sheet.padding,
      marginBottom: themeSpace(theme, 'sm'),
      minHeight: input.sizes.md.height,
      paddingHorizontal: input.base.padding_x,
      borderRadius: input.base.radius,
      ...nativeBoxStyle({ background: themeColor(theme, 'surface_alt') }),
      ...nativeTextStyle(input.base.text),
      color: input.base.text_color,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeSpace(theme, 'sm'),
      minHeight: menu.item_height,
      paddingHorizontal: sheet.padding,
    },
    rowSelected: { backgroundColor: menu.item_selected },
    rowText: { ...nativeTextStyle(menu.item_text), color: themeColor(theme, 'text'), flex: 1 },
    rowDisabled: { opacity: theme.native.tokens.opacity.disabled },
    pressed: { opacity: theme.native.tokens.opacity.pressed },
    // A sheet never covers the whole screen: the list scrolls past 60 % of it.
    list: { maxHeight: windowHeight * 0.6 },
  })
}

const OSelect = ({
  options,
  value,
  onSelect,
  placeholder,
  title,
  searchable = false,
  searchPlaceholder,
  disabled = false,
  hasError = false,
  renderTrigger,
  style,
  testID,
}: Props) => {
  const theme: any = useTheme()
  const { height } = useWindowDimensions()
  const styles = useMemo(() => selectStyles(theme, height), [theme, height])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find(option => option.value === value)
  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? options.filter(option => labelOf(option).toLowerCase().includes(term)) : options
  }, [options, query])

  const open = () => { if (!disabled) setIsOpen(true) }
  const close = () => { setIsOpen(false); setQuery('') }
  const choose = (option: SelectOption) => {
    close()
    onSelect(option.value, option)
  }

  return (
    <View style={style}>
      {renderTrigger ? renderTrigger({ open, selected, disabled }) : (
        <Pressable
          testID={testID}
          accessibilityRole='button'
          accessibilityState={{ disabled, expanded: isOpen }}
          onPress={open}
          style={({ pressed }) => [
            styles.trigger,
            hasError && styles.triggerError,
            disabled && styles.triggerDisabled,
            pressed && styles.pressed,
          ]}
        >
          {selected?.leading}
          <OText style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
            {selected ? selected.content ?? labelOf(selected) : placeholder}
          </OText>
          <Icon name='chevron-down' size={theme.native.components.input.base.trailing_icon_size} color={theme.native.components.input.base.icon_color} />
        </Pressable>
      )}
      <OBottomPopup open={isOpen} onClose={close} title={title} closeIcon transparent animationType='slide' presentationStyle='overFullScreen'>
        {searchable && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.native.components.input.base.placeholder}
            {...inputTint(theme)}
            maxFontSizeMultiplier={1.3}
            autoCorrect={false}
            style={styles.search}
          />
        )}
        <FlatList
          data={rows}
          keyExtractor={(option, index) => `${option.value ?? index}`}
          keyboardShouldPersistTaps='handled'
          style={styles.list}
          renderItem={({ item }) => {
            const isSelected = item.value === value
            return (
              <Pressable
                accessibilityRole='button'
                accessibilityState={{ selected: isSelected, disabled: !!item.disabled }}
                disabled={item.disabled}
                onPress={() => choose(item)}
                style={({ pressed }) => [
                  styles.row,
                  isSelected && styles.rowSelected,
                  item.disabled && styles.rowDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {item.leading}
                <OText style={styles.rowText} weight={isSelected ? 600 : undefined} numberOfLines={1}>{item.content ?? labelOf(item)}</OText>
                {isSelected && <Icon name='checkmark' size='md' color='primary' />}
              </Pressable>
            )
          }}
        />
      </OBottomPopup>
    </View>
  )
}

export default OSelect
