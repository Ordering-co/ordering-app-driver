/**
 * How a group of orders is named wherever it is: the list's card and its rows, the sheet and the forms ("Group No. 57": the
 * word, a space, the number). One text for one thing: the screens call this and never join the word and the number themselves.
 */
export const groupLabel = (t: (key: string, fallback?: string) => string, groupId: string | number): string =>
  `${t('GROUP_NRO', 'Group No.')} ${groupId}`
